const util = require('../modules/util');
const statusCode = require('../modules/statusCode');
const responseMessage = require('../modules/responseMessage');
const db = require('../db/db');
const jwtHandlers = require('../modules/jwtHandlers');
const invitationResponseService = require('../services/InvitationResponseService');
const invitationService = require('../services/InvitationService');
const userService = require('../services/UserService')
const { send } = require('../modules/slack');
const pushAlarm = require('../modules/pushAlarm');

const rejectInvitation = async (req, res) => {
  const { invitationId } = req.params;
  const { accesstoken } = req.headers;

  if (!invitationId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN));
  let client;

  const decodedToken = jwtHandlers.verify(accesstoken);
  if (decodedToken == TOKEN_INVALID) {
    return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
  }
  if (decodedToken == TOKEN_EXPIRED) {
    return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
  }
  const userId = decodedToken.id;

  try {
    client = await db.connect(req);
    const invitation = await invitationService.getInvitationById(client, invitationId);
    const guests = await invitationService.getGuestByInvitationId(client, invitationId);

    const guestIds = guests.map(function (value) {
      return value['id'];
    });

    if (!guestIds.includes(userId)) {
      await send(`
        req.originalURL: ${req.originalUrl}
        guestsIds: ${guestIds}
        userId: ${userId}
        `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, '해당 약속에 포함된 게스트가 아닙니다.'));
    }

    if (!invitation) {
      await send(`
        req.originalURL: ${req.originalUrl}
        invitationId: ${invitationId}
        `);
      return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_INVITATION));
    }
    if (invitation.isConfirmed || invitation.isCancled) {
      await send(`
        req.originalURL: ${req.originalUrl}
        isConfirmed: ${invitation.isConfirmed}
        isCancled: ${invitation.isCancled}
      `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.ALREADY_CONFIRM));
    }
    const data = await invitationResponseService.rejectInvitation(client, userId, invitationId);
    if (!data) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.INVITATION_REJECT_FAIL));
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.INVITATION_REJECT_SUCCESS, data));
  } catch (error) {
    console.log(error);
    await send(error);

    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const responseInvitation = async (req, res) => {
  const { invitationId } = req.params;
  const { invitationDateIds } = req.body;
  const { accesstoken } = req.headers;
  if (!accesstoken) return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN));
  console.log(invitationDateIds)
  if (!invitationId || invitationDateIds.length == 0 || !accesstoken) {
    await send(`
      req.originalURL: ${req.originalUrl}
      invitationId: ${invitationId}
      invitationDateIds: ${invitationDateIds}
      accesstoken: ${accesstoken}
      `);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }

  let client;
  const decodedToken = jwtHandlers.verify(accesstoken);
  if (decodedToken == TOKEN_INVALID) {
    return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, responseMessage.TOKEN))
  }
  if (decodedToken == TOKEN_EXPIRED) {
    return res.status(statusCode.UNAUTHORIZED).send(util.fail(statusCode.UNAUTHORIZED, "만료된 토큰입니다."))
  }
  const userId = decodedToken.id;

  try {
    client = await db.connect(req);
    const invitation = await invitationService.getInvitationById(client, invitationId);
    if (!invitation) {
      await send(`
        req.originalURL: ${req.originalUrl}
        invitation: ${JSON.stringify(invitation)}
        `);
      return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_INVITATION));
    }

    if (invitation.isConfirmed || invitation.isCancled) {
      await send(`
        req.originalURL: ${req.originalUrl}
        isConfirmed: ${invitation.isConfirmed}
        isCancled: ${invitation.isCancled}
      `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.ALREADY_CONFIRM));
    }
    const guests = await invitationService.getGuestByInvitationId(client, invitationId);

    const guestIds = guests.map(function (value) {
      return value['id'];
    });

    if (!guestIds.includes(userId)) {
      await send(`
        req.originalURL: ${req.originalUrl}
        guestsIds: ${guestIds}
        userId: ${userId}
        `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, '해당 약속에 포함된 게스트가 아닙니다.'));
    }

    const realDateIds = await invitationService.getInvitationDateByInvitationId(client, invitationId);

    for (let dateId of invitationDateIds) {
      if (realDateIds.includes(dateId)) {
        console.log('success');
      } else {
        await send(`
          req.originalURL: ${req.originalUrl}
          DateChoice: ${JSON.stringify(realDateIds)}
          `);
        return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, '해당 날짜가 존재하지 않습니다.'));
      }
    }

    const data = await invitationResponseService.responseInvitation(client, userId, invitationId, invitationDateIds);
    if (!data) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.INVITATION_RESPONSE_FAIL));
    const hostId = invitation.hostId
    const host = await userService.getUserById(client, hostId)
    const user = await userService.getUserById(client, userId)
    const dates = await invitationResponseService.getdateByDateIds(client, [invitationDateIds])
    const confirmMessage = `${user.username}님이 답변을 보냈어요!`
    const description = []
    dates.map(value => {
      const date = new Date(value.date)
      const month = date.getMonth()
      const day = date.getDate()
      description.push(`${month}-${day}-${value.start} 선택!`)
    })
    const confirmDescription = description.join('\n')
    pushAlarm.sendPushAlarmWithId(confirmMessage, confirmDescription, invitationId, host.fcm)
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.INVITATION_RESPONSE_SUCCESS, data));
  } catch (error) {
    console.log(error);
    await send(error);

    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = {
  rejectInvitation,
  responseInvitation,
};
