const util = require('../modules/util');
const statusCode = require('../modules/statusCode');
const responseMessage = require('../modules/responseMessage');
const db = require('../db/db');
const jwtHandlers = require('../modules/jwtHandlers');
const invitationService = require('../services/InvitationService');
const { send } = require('../modules/slack');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const userService = require('../services/userService')

const getCanceledInvitation = async (req, res) => {
  const { invitationId } = req.params;
  if (!invitationId) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  let client;
  try {
    client = await db.connect(req);

    const data = await invitationService.getCanceledInvitation(client, invitationId);
    const guest = await invitationService.getGuestByInvitationId(client, invitationId);
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_INVITATION_SUCCESS, { ...data, guest }));
  } catch (error) {
    console.log(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const cancelInvitation = async (req, res) => {
  const { invitationId } = req.params;
  const { accesstoken } = req.headers;
  if (!invitationId) {
    await send(`
        req.originalURL: ${req.originalUrl}
        invitationId: ${invitationId}
      `);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }

  let client;

  const decodedToken = jwtHandlers.verify(accesstoken);
  const userId = decodedToken.id;

  try {
    client = await db.connect(req);
    const invitation = await invitationService.getInvitationById(client, invitationId);
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
    const host = await invitationService.getHostByInvitationId(client, invitationId);
    if (host.id != userId) {
      await send(`
        req.originalURL: ${req.originalUrl}
        hostId: ${host.id}
        userId: ${userId}
        `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, '해당 유저가 보낸 약속이 아닙니다.'));
    }
    const data = await invitationService.cancleInvitation(client, invitationId);
    if (!data) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.INVITATION_CANCLE_FAIL));
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.INVITATION_CANCLE_SUCCESS, data));
  } catch (error) {
    console.log(error);
    await send(error);

    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const confirmInvitation = async (req, res) => {
  const { invitationId } = req.params;
  const { dateId } = req.body;
  const { accesstoken } = req.headers;

  if (!dateId || !accesstoken) {
    await send(`
      req.originalURL: ${req.originalUrl}
      dateId: ${dateId},
      accesstoken: ${accesstoken}
      `);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }

  let client;

  const decodedToken = jwtHandlers.verify(accesstoken);
  const userId = decodedToken.id;

  try {
    client = await db.connect(req);
    const invitation = await invitationService.getInvitationById(client, invitationId);
    const invitationByDateId = await invitationService.getInvitationByDateId(client, dateId, invitationId);
    if (!invitationByDateId) {
      await send(
        `
          req.originalURL: ${req.originalUrl},
          invitation: ${JSON.stringify(invitation)}
          dateId: ${invitationByDateId}
          `,
      );
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_INVITATION_DATE));
    }
    if (!invitation) return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_INVITATION));
    if (invitation.isConfirmed || invitation.isCancled) {
      await send(`
        req.originalURL: ${req.originalUrl}
        isConfirmed: ${invitation.isConfirmed}
        isCancled: ${invitation.isCancled}
      `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.ALREADY_CONFIRM));
    }
    const host = await invitationService.getHostByInvitationId(client, invitationId);
    if (host.id != userId) {
      await send(`
        req.originalURL: ${req.originalUrl}
        hostId: ${host.id}
        userId: ${userId}
        `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, '해당 유저가 보낸 약속이 아닙니다.'));
    }
    const guests = await invitationService.getGuestByInvitationId(client, invitationId);
    const data = await invitationService.confirmInvitation(client, host, invitationId, guests, dateId);
    if (!data) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.INVITATION_CONFIRM_FAIL));
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.INVITATION_CONFIRM_SUCCESS, data));
  } catch (error) {
    console.log(error);
    await send(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const getInvitationById = async (req, res) => {
  const { invitationId } = req.params;
  const { accesstoken } = req.headers;

  if (!invitationId || !accesstoken) {
    await send(`accesstoken: ${accesstoken}\ninvitationId: ${invitationId}`);
    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  let client;

  const decodedToken = jwtHandlers.verify(accesstoken);
  const userId = decodedToken.id;

  try {
    client = await db.connect(req);

    const host = await invitationService.getHostByInvitationId(client, invitationId);

    if (!host) {
      await send(`invitationId: ${invitationId}\nhost: ${host}`);
      return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_INVITATION));
    }
    const guests = await invitationService.getGuestByInvitationId(client, invitationId);
    const newGuests = guests.filter(o => o.id != userId);
    const rejectGuests = await invitationService.getRejectGuestByInvitationId(client, invitationId);
    if (host.id == userId) {
      await send(`host: ${host}\nuserId: ${userId}`);
      const data = await invitationService.getInvitationSentById(client, host, guests, invitationId);
      if (!data) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.READ_INVITATION_FAIL));
      res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_INVITATION_SUCCESS, { ...data, rejectGuests }));
    } else {
      const response = await invitationService.getResponseByUserId(client, userId, invitationId);
      let isResponse = false;
      if (response.length > 0) {
        isResponse = true;
      }
      const data = await invitationService.getInvitationReceivedById(client, userId, host, invitationId, isResponse);
      if (!data) return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.READ_INVITATION_FAIL));
      res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_INVITATION_SUCCESS, { isResponse, ...data, newGuests, rejectGuests }));
    }
  } catch (error) {
    console.log(error);
    await send(error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const getInvitation = async (req, res) => {
  const { accesstoken } = req.headers;

  let client;

  try {
    client = await db.connect(req);
    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;

    if (!userId) {
      await send(`
        req.originalURL: ${req.originalUrl},
        userId: ${userId}
        `);
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }
    const invitations = await invitationService.getAllInvitation(client, userId);

    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.READ_ALL_INVITATION_SUCCESS, invitations));
  } catch (error) {
    console.log(error);
    await send(error);

    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

const postInvitation = async (req, res) => {
  const { accesstoken } = req.headers;
  const { guests, invitationTitle, invitationDesc, date, start, end } = req.body;

  if (!guests || !invitationTitle || !invitationDesc || !date || !start || !end || !accesstoken) {
    await send(
      `req.originalURL: ${req.originalUrl}
        guests: ${JSON.stringify(guests)},
        invitationTitle: ${invitationTitle},
        invitationDesc: ${invitationDesc},
        date: ${date},
        start: ${start},
        end: ${end},
        accesstoken: ${accesstoken}
          `,
    );

    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }
  if (!(date.length == start.length) && !(date.length == end.length)) {
    await send(`
        req.originalURL: ${req.originalUrl},
        date.length: ${date.length},
        start.length: ${start.length},
        end.length: ${end.length}
        `);

    return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
  }

  let client;

  try {
    client = await db.connect(req);

    const decodedToken = jwtHandlers.verify(accesstoken);
    const userId = decodedToken.id;

    if (!userId) {
      await send(
        `
            req.originalURL: ${req.originalUrl}
            userId: ${userId}
            `,
      );

      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    for (let guest of guests) {
      let user = await userService.getUserinfoByuserIds(client, [guest.id]);
      if (user.length == 0) {
        await send(`
          req.originalURL: ${req.originalUrl}
          user: ${user}
          guest: ${guest.id}
          `);
        return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));
      }
    }

    const invitation = await invitationService.createInvitation(client, userId, invitationTitle, invitationDesc);
    const invitationId = invitation.id;
    const userConnection = await invitationService.createInvitationUserConnection(client, invitationId, guests);
    if (userConnection.length == 0) {
      return res.status(statusCode.NOT_FOUND).send(util.fail(statusCode.NOT_FOUND, responseMessage.NO_USER));
    }
    const dates = await invitationService.createInvitationDate(client, invitationId, date, start, end);
    res.status(statusCode.OK).send(util.success(statusCode.OK, responseMessage.INVITATION_SUCCESS, { invitation, guests, dates }));
  } catch (error) {
    console.log(error);
    await send(error);

    res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  } finally {
    client.release();
  }
};

module.exports = {
  getCanceledInvitation,
  cancelInvitation,
  confirmInvitation,
  getInvitationById,
  getInvitation,
  postInvitation,
};
