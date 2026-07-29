import { getRepository } from '../../database/index.js';
import { User } from './entities/user.entity.js';

export const createUsersService = () => {
  const getUserRepo = () => getRepository(User);

  const findByEmail = async (email) => {
    return getUserRepo().findOne({ where: { email } });
  };

  const findByEmailWithPassword = async (email) => {
    return getUserRepo().findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  };

  const findById = async (id) => {
    return getUserRepo().findOne({ where: { id: parseInt(id, 10) } });
  };

  const create = async (userData) => {
    const existing = await findByEmail(userData.email || '');
    if (existing) {
      const err = new Error('User with this email already exists');
      err.statusCode = 409;
      throw err;
    }
    const user = getUserRepo().create(userData);
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

  return {
    findByEmail,
    findByEmailWithPassword,
    findById,
    create,
    updateAvatar,
    updatePassword,
  };
};

export const usersService = createUsersService();
