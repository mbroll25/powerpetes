import { mkdir, writeFile } from "node:fs/promises";

const assets = [
  {
    output: "public/lol/roles/top.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png",
  },
  {
    output: "public/lol/roles/jungle.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png",
  },
  {
    output: "public/lol/roles/mid.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png",
  },
  {
    output: "public/lol/roles/adc.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png",
  },
  {
    output: "public/lol/roles/support.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png",
  },

  {
    output: "public/lol/ranks/iron.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-iron.png",
  },
  {
    output: "public/lol/ranks/bronze.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-bronze.png",
  },
  {
    output: "public/lol/ranks/silver.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-silver.png",
  },
  {
    output: "public/lol/ranks/gold.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-gold.png",
  },
  {
    output: "public/lol/ranks/platinum.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-platinum.png",
  },
  {
    output: "public/lol/ranks/emerald.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-emerald.png",
  },
  {
    output: "public/lol/ranks/diamond.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-diamond.png",
  },
  {
    output: "public/lol/ranks/master.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-master.png",
  },
  {
    output: "public/lol/ranks/grandmaster.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-grandmaster.png",
  },
  {
    output: "public/lol/ranks/challenger.png",
    url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-challenger.png",
  },
];

async function downloadAsset(asset) {
  const response = await fetch(asset.url);

  if (!response.ok) {
    throw new Error(`No se pudo descargar ${asset.url}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await mkdir(asset.output.split("/").slice(0, -1).join("/"), {
    recursive: true,
  });

  await writeFile(asset.output, buffer);

  console.log(`Descargado: ${asset.output}`);
}

async function main() {
  for (const asset of assets) {
    await downloadAsset(asset);
  }

  console.log("Assets de LoL descargados correctamente.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
