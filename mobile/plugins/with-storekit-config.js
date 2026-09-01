const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * StoreKit の設定ファイルを Run スキームに紐づける。
 *
 * これは本来 Xcode の Edit Scheme → Run → Options で選ぶ設定で、
 * ios/ の .xcscheme に書かれる。ios/ は prebuild が作り直すため
 * 手で設定すると毎回消える。ここで自動的に付け直す。
 *
 * 設定ファイル自体は ios/ の外（mobile/ 直下）に置く。中に置くと同様に消える。
 */
module.exports = function withStoreKitConfig(config, { file } = {}) {
  const fileName = file ?? "StudyDash.storekit";

  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const { platformProjectRoot, projectName, projectRoot } = cfg.modRequest;

      const source = path.join(projectRoot, fileName);
      if (!fs.existsSync(source)) {
        console.warn(`[storekit] ${fileName} が見つからないので紐づけを飛ばします`);
        return cfg;
      }

      const schemePath = path.join(
        platformProjectRoot,
        `${projectName}.xcodeproj`,
        "xcshareddata",
        "xcschemes",
        `${projectName}.xcscheme`,
      );

      if (!fs.existsSync(schemePath)) {
        console.warn("[storekit] スキームが見つからないので紐づけを飛ばします");
        return cfg;
      }

      let xml = fs.readFileSync(schemePath, "utf8");

      if (xml.includes("StoreKitConfigurationFileReference")) {
        return cfg;
      }

      // identifier は .xcodeproj から見た相対パス。
      // ios/StudyDash.xcodeproj → ../.. で mobile/ に届く。
      const reference =
        `      <StoreKitConfigurationFileReference\n` +
        `         identifier = "../../${fileName}">\n` +
        `      </StoreKitConfigurationFileReference>\n`;

      xml = xml.replace("   </LaunchAction>", `${reference}   </LaunchAction>`);
      fs.writeFileSync(schemePath, xml);
      console.log(`[storekit] ${fileName} を Run スキームに紐づけました`);

      return cfg;
    },
  ]);
};
