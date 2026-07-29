import { getRepository } from '../../database/index.js';
import { Vendor } from './entities/vendor.entity.js';
import { Affiliate } from './entities/affiliate.entity.js';

export const createPartnersService = () => {
  const getVendorRepo = () => getRepository(Vendor);
  const getAffiliateRepo = () => getRepository(Affiliate);

  const normalizeCode = (code) => code.trim().toLowerCase();

  const listVendors = async (userId) => {
    return getVendorRepo().find({
      where: { userId },
      relations: { affiliates: true },
      order: { createdAt: 'DESC' },
    });
  };

  const getVendor = async (id, userId) => {
    const vendor = await getVendorRepo().findOne({
      where: { id: parseInt(id, 10), userId },
      relations: { affiliates: true },
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
    return getVendorRepo().save(vendor);
  };

  const removeVendor = async (id, userId) => {
    const vendor = await getVendor(id, userId);
    vendor.active = false;
    await getVendorRepo().save(vendor);
  };

  const listAffiliates = async (vendorId, userId) => {
    await getVendor(vendorId, userId);
    return getAffiliateRepo().find({
      where: { vendorId: parseInt(vendorId, 10), userId },
      order: { createdAt: 'DESC' },
    });
  };

  const createAffiliate = async (dto, userId) => {
    await getVendor(dto.vendorId, userId);
    const code = normalizeCode(dto.code);
    const existing = await getAffiliateRepo().findOne({
      where: { userId, code },
    });
    if (existing) {
      const err = new Error(`Affiliate code "${code}" already exists`);
      err.statusCode = 409;
      throw err;
    }
    const affiliate = getAffiliateRepo().create({
      name: dto.name.trim(),
      code,
      vendorId: dto.vendorId,
      userId,
      active: dto.active ?? true,
    });
    return getAffiliateRepo().save(affiliate);
  };

  const updateAffiliate = async (id, dto, userId) => {
    const affiliate = await getAffiliateRepo().findOne({
      where: { id: parseInt(id, 10), userId },
    });
    if (!affiliate) {
      const err = new Error(`Affiliate ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);
      if (code !== affiliate.code) {
        const clash = await getAffiliateRepo().findOne({
          where: { userId, code },
        });
        if (clash) {
          const err = new Error(`Affiliate code "${code}" already exists`);
          err.statusCode = 409;
          throw err;
        }
      }
      affiliate.code = code;
    }
    if (dto.name !== undefined) affiliate.name = dto.name.trim();
    if (dto.active !== undefined) affiliate.active = dto.active;
    return getAffiliateRepo().save(affiliate);
  };

  const removeAffiliate = async (id, userId) => {
    const affiliate = await getAffiliateRepo().findOne({
      where: { id: parseInt(id, 10), userId },
    });
    if (!affiliate) {
      const err = new Error(`Affiliate ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    affiliate.active = false;
    await getAffiliateRepo().save(affiliate);
  };

  const resolveAttribution = async (vidCode, affCode) => {
    let vendorId;
    let affiliateId;
    let mismatch = false;

    const normalizedVid = vidCode ? normalizeCode(vidCode) : '';
    const normalizedAff = affCode ? normalizeCode(affCode) : '';

    if (normalizedVid) {
      const vendor = await getVendorRepo()
        .createQueryBuilder('v')
        .where('LOWER(v.code) = :code', { code: normalizedVid })
        .getOne();
      if (vendor) vendorId = vendor.id;
    }

    if (normalizedAff) {
      const affiliate = await getAffiliateRepo()
        .createQueryBuilder('a')
        .where('LOWER(a.code) = :code', { code: normalizedAff })
        .getOne();
      if (affiliate) {
        affiliateId = affiliate.id;
        if (vendorId && affiliate.vendorId !== vendorId) {
          mismatch = true;
        } else if (!vendorId) {
          vendorId = affiliate.vendorId;
        }
      }
    }

    return { vendorId, affiliateId, mismatch };
  };

  return {
    normalizeCode,
    listVendors,
    getVendor,
    createVendor,
    updateVendor,
    removeVendor,
    listAffiliates,
    createAffiliate,
    updateAffiliate,
    removeAffiliate,
    resolveAttribution,
  };
};

export const partnersService = createPartnersService();
