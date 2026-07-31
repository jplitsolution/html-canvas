import { getRepository } from '../../database/index.js';
import { Vendor } from './entities/vendor.entity.js';

export const createPartnersService = () => {
  const getVendorRepo = () => getRepository(Vendor);

  const normalizeCode = (code) => code.trim().toLowerCase();

  const listVendors = async (userId) => {
    return getVendorRepo().find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  };

  const getVendor = async (id, userId) => {
    const vendor = await getVendorRepo().findOne({
      where: { id: parseInt(id, 10), userId },
    });
    if (!vendor) {
      const err = new Error(`Vendor ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    return vendor;
  };

  const createVendor = async (dto, userId) => {
    const code = normalizeCode(dto.code);
    const existing = await getVendorRepo().findOne({
      where: { userId, code },
    });
    if (existing) {
      const err = new Error(`Vendor code "${code}" already exists`);
      err.statusCode = 409;
      throw err;
    }
    const vendor = getVendorRepo().create({
      name: dto.name.trim(),
      code,
      userId,
      active: dto.active ?? true,
      postbackUrl: dto.postbackUrl?.trim() || null,
    });
    return getVendorRepo().save(vendor);
  };

  const updateVendor = async (id, dto, userId) => {
    const vendor = await getVendor(id, userId);
    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);
      if (code !== vendor.code) {
        const clash = await getVendorRepo().findOne({
          where: { userId, code },
        });
        if (clash) {
          const err = new Error(`Vendor code "${code}" already exists`);
          err.statusCode = 409;
          throw err;
        }
      }
      vendor.code = code;
    }
    if (dto.name !== undefined) vendor.name = dto.name.trim();
    if (dto.active !== undefined) vendor.active = dto.active;
    if (dto.postbackUrl !== undefined) {
      vendor.postbackUrl = dto.postbackUrl?.trim() || null;
    }
    return getVendorRepo().save(vendor);
  };

  const removeVendor = async (id, userId) => {
    const vendor = await getVendor(id, userId);
    vendor.active = false;
    await getVendorRepo().save(vendor);
  };

  /** Resolve traffic partner from vid only (affiliates removed from product). */
  const resolveAttribution = async (vidCode) => {
    let vendorId;
    const normalizedVid = vidCode ? normalizeCode(vidCode) : '';

    if (normalizedVid) {
      const vendor = await getVendorRepo()
        .createQueryBuilder('v')
        .where('LOWER(v.code) = :code', { code: normalizedVid })
        .getOne();
      if (vendor) vendorId = vendor.id;
    }

    return { vendorId, affiliateId: null, mismatch: false };
  };

  return {
    normalizeCode,
    listVendors,
    getVendor,
    createVendor,
    updateVendor,
    removeVendor,
    resolveAttribution,
  };
};

export const partnersService = createPartnersService();
