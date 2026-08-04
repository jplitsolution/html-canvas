import { getRepository } from '../../database/index.js';
import { User } from './entities/user.entity.js';
import {
  USER_STATUSES,
  isAdminEmail,
  normalizeEmail,
  withRole,
} from '../../common/admin.js';

export const createUsersService = () => {
  const getUserRepo = () => getRepository(User);

  const findByEmail = async (email) => {
    return getUserRepo().findOne({
      where: { email: normalizeEmail(email) },
    });
  };

  const findByEmailWithPassword = async (email) => {
    return getUserRepo().findOne({
      where: { email: normalizeEmail(email) },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        avatar: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  };

  const findById = async (id) => {
    return getUserRepo().findOne({ where: { id: parseInt(id, 10) } });
  };

  const create = async (userData) => {
    const email = normalizeEmail(userData.email);
    const existing = await findByEmail(email);
    if (existing) {
      const err = new Error('User with this email already exists');
      err.statusCode = 409;
      throw err;
    }
    const user = getUserRepo().create({
      ...userData,
      email,
      status: userData.status || 'active',
    });
    return getUserRepo().save(user);
  };

  const updateAvatar = async (id, avatarUrl) => {
    await getUserRepo().update(id, { avatar: avatarUrl });
    const updated = await findById(id);
    if (!updated) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return updated;
  };

  const updatePassword = async (id, hashedPassword) => {
    await getUserRepo().update(id, { password: hashedPassword });
  };

  const listAll = async () => {
    const users = await getUserRepo().find({
      order: { id: 'ASC' },
    });
    return users.map(withRole);
  };

  const updateUser = async (id, patch) => {
    const user = await findById(id);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    if (isAdminEmail(user.email)) {
      if (patch.status && patch.status !== 'active') {
        const err = new Error('Cannot suspend or deactivate the admin account');
        err.statusCode = 400;
        throw err;
      }
      if (patch.email && normalizeEmail(patch.email) !== normalizeEmail(user.email)) {
        const err = new Error('Cannot change the admin email from the panel');
        err.statusCode = 400;
        throw err;
      }
    }

    const updates = {};

    if (patch.name != null) {
      const name = String(patch.name).trim();
      if (!name) {
        const err = new Error('name is required');
        err.statusCode = 400;
        throw err;
      }
      updates.name = name;
    }

    if (patch.email != null) {
      const email = normalizeEmail(patch.email);
      if (!email) {
        const err = new Error('email is required');
        err.statusCode = 400;
        throw err;
      }
      if (email !== normalizeEmail(user.email)) {
        const existing = await findByEmail(email);
        if (existing && existing.id !== user.id) {
          const err = new Error('User with this email already exists');
          err.statusCode = 409;
          throw err;
        }
        updates.email = email;
      }
    }

    if (patch.status != null) {
      if (!USER_STATUSES.includes(patch.status)) {
        const err = new Error(
          `status must be one of: ${USER_STATUSES.join(', ')}`,
        );
        err.statusCode = 400;
        throw err;
      }
      updates.status = patch.status;
    }

    if (Object.keys(updates).length > 0) {
      await getUserRepo().update(user.id, updates);
    }

    const updated = await findById(user.id);
    return withRole(updated);
  };

  return {
    findByEmail,
    findByEmailWithPassword,
    findById,
    create,
    updateAvatar,
    updatePassword,
    listAll,
    updateUser,
  };
};

export const usersService = createUsersService();
