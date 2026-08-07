import { readFileSync } from 'fs';
import { join } from 'path';
import { getRepository } from '../index.js';
import { Template } from '../entities/template.entity.js';

export const seedPrebuiltTemplates = async () => {
  const templateRepository = getRepository(Template);
  const existing = await templateRepository.count({
    where: { isPrebuilt: true },
  });

  if (existing > 0) {
    console.log(
      `Skipping seed — ${existing} prebuilt template(s) already exist`,
    );
    return;
  }

  const jsonPath = new URL('./prebuilt-templates.json', import.meta.url);
  const seeds = JSON.parse(readFileSync(jsonPath, 'utf8'));

  for (const seed of seeds) {
    const template = templateRepository.create({
      name: seed.name,
      isPrebuilt: true,
      userId: undefined,
      data: {
        slug: seed.id,
        description: seed.description,
        thumbnail: seed.thumbnail,
        editor: seed.editor || 'grapesjs',
        projectData: seed.projectData || {},
        html: seed.html || '',
        css: seed.css || '',
      },
    });
    await templateRepository.save(template);
  }

  console.log(`Seeded ${seeds.length} prebuilt templates`);
};
