import { getRepository } from '../../database/index.js';
import { Template } from '../../database/entities/template.entity.js';

export const createTemplatesService = () => {
  const getRepo = () => getRepository(Template);

  const findAllPrebuilt = async () => {
    const templates = await getRepo().find({
      where: { isPrebuilt: true },
      order: { createdAt: 'DESC' },
    });
    return templates.map((template) => {
      if (template.data) {
        const { projectData, html, css, ...restData } = template.data;
        template.data = restData;
      }
      return template;
    });
  };

  const findUserTemplates = async (userId) => {
    const templates = await getRepo().find({
      where: { userId, isPrebuilt: false },
      order: { updatedAt: 'DESC' },
    });
    return templates.map((template) => {
      if (template.data) {
        const { projectData, html, css, ...restData } = template.data;
        template.data = restData;
      }
      return template;
    });
  };

  const findOne = async (id, userId) => {
    const template = await getRepo().findOne({ where: { id: parseInt(id, 10) } });
    if (!template) {
      const err = new Error(`Template with ID ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    if (!template.isPrebuilt && template.userId !== userId) {
      const err = new Error('You do not have permission to access this template');
      err.statusCode = 403;
      throw err;
    }

    return template;
  };

  const create = async (createTemplateDto, userId) => {
    const template = getRepo().create({
      ...createTemplateDto,
      userId,
      isPrebuilt: userId ? (createTemplateDto.isPrebuilt ?? false) : true,
    });
    return getRepo().save(template);
  };

  const remove = async (id, userId) => {
    const template = await findOne(id, userId);
    if (template.isPrebuilt) {
      const err = new Error('Cannot delete prebuilt system templates');
      err.statusCode = 403;
      throw err;
    }
    await getRepo().remove(template);
  };

  return {
    findAllPrebuilt,
    findUserTemplates,
    findOne,
    create,
    remove,
  };
};

export const templatesService = createTemplatesService();
