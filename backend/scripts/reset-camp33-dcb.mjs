import { initDatabase } from '../src/database/index.js';
import { getDefaultFunnelPageData } from '../src/database/seed/default-funnel-pages.js';
import UniverseDcb from '../src/modules/flow/flows/UniverseDcb.js';
import { redisService } from '../src/common/services/redis.service.js';

async function main() {
  const ds = await initDatabase();
  const campRepo = ds.getRepository('Campaign');
  const pageRepo = ds.getRepository('CampaignPage');
  const tmplRepo = ds.getRepository('Template');

  // 1. Update Campaign 33
  const flowConfig = UniverseDcb.getDefaultFlowConfig();
  await campRepo.update(
    { id: 33 },
    {
      cappingEnabled: false,
      verificationMode: 'UNIVERSE_DCB',
      flowConfig: JSON.stringify(flowConfig),
    }
  );
  console.log('✅ Updated Campaign 33: capping disabled, flowConfig reset to UNIVERSE_DCB standard graph.');

  // 2. Fetch pages
  const pages = await pageRepo.find({
    where: { campaignId: 33 },
    relations: { template: true },
  });

  for (const page of pages) {
    const defaultData = getDefaultFunnelPageData(page.pageType, {
      verificationMode: 'UNIVERSE_DCB',
    });
    if (page.template) {
      page.template.data = defaultData;
      await tmplRepo.save(page.template);
      console.log(`✅ Updated Template ${page.template.id} for Page ${page.pageType}`);
    }
  }

  // 3. Clear Redis keys for campaign 33
  const client = redisService.getClient();
  if (client) {
    const keys = await client.keys('*33*');
    for (const k of keys) {
      await client.del(k);
    }
    console.log(`✅ Cleared ${keys.length} Redis keys matching *33*`);
  }

  await ds.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
