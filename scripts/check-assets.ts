import { db } from "../src/lib/db";

async function main() {
  const site = await db.siteConfig.findFirst();
  console.log("avatarPath:", site?.avatarPath);
  console.log("artworkPath:", site?.artworkPath);
  console.log("portraitPath:", site?.portraitPath);
  console.log("signaturePath:", site?.signaturePath);
  const media = await db.mediaAsset.findMany({ select: { filename: true, originalName: true, mime: true, width: true, height: true } });
  console.log("MEDIA:", JSON.stringify(media, null, 1));
}
main();
