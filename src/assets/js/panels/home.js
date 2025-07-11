/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
import { config, database, logger, changePanel, appdata, setStatus, pkg, popup } from "../utils.js";

const { Launch } = require("minecraft-java-core");
const { shell, ipcRenderer } = require("electron");

class Home {
  static id = "home";
  async init(config) {
    this.config = config;
    this.db = new database();
    this.socialLick();
    this.instancesSelect();
    document.querySelector(".settings-btn").addEventListener("click", (e) => {
      changePanel("settings");
    });
    this.updateStatus();
  }

  async updateStatus() {
    setInterval(async () => {
      let configClient = await this.db.readData("configClient");
      let instancesList = await config.getInstanceList();
      let instanceSelect = instancesList.find((instance) => instance.name === configClient.instance_selct);
      if (instanceSelect == null) {
        return;
      }

      await setStatus(instanceSelect.status);
    }, 15000);
  }

  socialLick() {
    let socials = document.querySelectorAll(".social-block");

    socials.forEach((social) => {
      social.addEventListener("click", (e) => {
        shell.openExternal(e.target.dataset.url);
      });
    });
  }

  async instancesSelect() {
    let configClient = await this.db.readData("configClient");
    let auth = await this.db.readData("accounts", configClient.account_selected);
    let instancesList = await config.getInstanceList();
    let instanceSelect = instancesList.find((instance) => instance.name === configClient.instance_selct);

    const instanceSelectBTN = document.querySelector(".instance-select");
    const instancePopup = document.querySelector(".instance-popup");
    const instancesListPopup = document.querySelector(".instances-List");
    const instanceCloseBTN = document.querySelector(".close-popup");
    const playBtn = document.querySelector(".center .btn");

    if (instanceSelectBTN && instanceSelect) {
      instanceSelectBTN.childNodes[0].nodeValue = instanceSelect.name;
      setStatus(instanceSelect.status);
    }

    if (instancesList.length === 1 && instanceSelectBTN) {
      instanceSelectBTN.style.display = "none";
    }

    if (!instanceSelect) {
      let newInstanceSelect = instancesList.find((i) => i.whitelistActive == false);
      configClient.instance_selct = newInstanceSelect.name;
      instanceSelect = newInstanceSelect.name;
      await this.db.updateData("configClient", configClient);
    }

    for (let instance of instancesList) {
      if (instance.whitelistActive) {
        let whitelist = instance.whitelist.find((w) => w == auth?.name);
        if (whitelist !== auth?.name) {
          if (instance.name == instanceSelect) {
            let newInstanceSelect = instancesList.find((i) => i.whitelistActive == false);
            configClient.instance_selct = newInstanceSelect.name;
            instanceSelect = newInstanceSelect.name;
            await setStatus(newInstanceSelect.status);
            await this.db.updateData("configClient", configClient);
          }
        }
      } else {
        if (instance.name == instanceSelect) {
          await setStatus(instance.status);
        }
      }
    }

    if (instanceSelectBTN) {
      instanceSelectBTN.addEventListener("click", () => {
        instancesListPopup.innerHTML = "";
        for (let instance of instancesList) {
          if (instance.whitelistActive) {
            if (instance.whitelist.includes(auth?.name)) {
              if (instance.name == instanceSelect) {
                instancesListPopup.innerHTML += `<div id="${instance.name}" class="btn instance-elements active-instance">${instance.name} <div class="icon-arrow"></div></div>`;
              } else {
                instancesListPopup.innerHTML += `<div id="${instance.name}" class="btn instance-elements">${instance.name} <div class="icon-arrow"></div></div>`;
              }
            }
          } else {
            if (instance.name == instanceSelect) {
              instancesListPopup.innerHTML += `<div id="${instance.name}" class="btn instance-elements active-instance">${instance.name} <div class="icon-arrow"></div></div>`;
            } else {
              instancesListPopup.innerHTML += `<div id="${instance.name}" class="btn instance-elements">${instance.name} <div class="icon-arrow"></div></div>`;
            }
          }
        }

        instancePopup.style.display = "flex";
      });
    }

    if (instanceCloseBTN) {
      instanceCloseBTN.addEventListener("click", () => {
        instancePopup.style.display = "none";
      });
    }

    if (instancePopup) {
      instancePopup.addEventListener("click", async (e) => {
        if (e.target.classList.contains("instance-elements")) {
          let newInstanceSelect = e.target.id;
          let activeInstanceSelect = document.querySelector(".active-instance");

          if (activeInstanceSelect) activeInstanceSelect.classList.remove("active-instance");
          e.target.classList.add("active-instance");

          configClient.instance_selct = newInstanceSelect;
          await this.db.updateData("configClient", configClient);

          instanceSelect = newInstanceSelect;
          //instancePopup.style.display = "none";

          let instance = await config.getInstanceList();
          let options = instance.find((i) => i.name == configClient.instance_selct);
          await setStatus(options.status);

          if (instanceSelectBTN) instanceSelectBTN.childNodes[0].nodeValue = newInstanceSelect;
        }
      });
    }

    if (playBtn) {
      playBtn.addEventListener("click", () => {
        this.startGame();
      });
    }
  }

  async startGame() {
    let launch = new Launch();
    let configClient = await this.db.readData("configClient");
    let instance = await config.getInstanceList();
    let authenticator = await this.db.readData("accounts", configClient.account_selected);
    let options = instance.find((i) => i.name == configClient.instance_selct);

    let playInstanceBTN = document.querySelector(".play-instance");
    let infoStartingBOX = document.querySelector(".info-starting-game");
    let infoStarting = document.querySelector(".info-starting-game-text");
    let progressBar = document.querySelector(".progress-bar");

    let opt = {
      url: options.url,
      authenticator: authenticator,
      timeout: 10000,
      path: `${await appdata()}/${process.platform == "darwin" ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`,
      instance: options.name,
      version: options.loadder.minecraft_version,
      detached: configClient.launcher_config.closeLauncher == "close-all" ? false : true,
      downloadFileMultiple: configClient.launcher_config.download_multi,
      intelEnabledMac: configClient.launcher_config.intelEnabledMac,

      loader: {
        type: options.loadder.loadder_type,
        build: options.loadder.loadder_version,
        enable: options.loadder.loadder_type == "none" ? false : true,
      },

      //verify: options.verify,
      verify: false,
      
      ignored: [...options.ignored],

      java: {
        path: configClient.java_config.java_path,
      },

      JVM_ARGS: options.jvm_args ? options.jvm_args : [],
      GAME_ARGS: options.game_args ? options.game_args : [],

      screen: {
        width: configClient.game_config.screen_size.width,
        height: configClient.game_config.screen_size.height,
      },

      memory: {
        min: `${configClient.java_config.java_memory.min * 1024}M`,
        max: `${configClient.java_config.java_memory.max * 1024}M`,
      },
    };

    let fakeProgress = 0;
    let fakeInterval = setInterval(() => {
      fakeProgress += 1;
      if (fakeProgress > 100) fakeProgress = 100;
      progressBar.value = fakeProgress;
      progressBar.max = 100;
      infoStarting.innerHTML = `Preparando... ${fakeProgress}%`;
    }, 30);
    launch.Launch(opt);

    playInstanceBTN.style.display = "none";
    infoStartingBOX.style.display = "block";
    progressBar.style.display = "";
    ipcRenderer.send("main-window-progress-load");

    launch.on("extract", (extract) => {
      clearInterval(fakeInterval);
      ipcRenderer.send("main-window-progress-load");
      console.log(extract);
    });

    launch.on("progress", (progress, size) => {
      clearInterval(fakeInterval);
      infoStarting.innerHTML = `Download ${((progress / size) * 100).toFixed(0)}%`;
      ipcRenderer.send("main-window-progress", { progress, size });
      progressBar.value = progress;
      progressBar.max = size;
    });

    launch.on("check", (progress, size) => {
      clearInterval(fakeInterval);
      infoStarting.innerHTML = `Verificação ${((progress / size) * 100).toFixed(0)}%`;
      ipcRenderer.send("main-window-progress", { progress, size });
      progressBar.value = progress;
      progressBar.max = size;
    });

    launch.on("estimated", (time) => {
      clearInterval(fakeInterval);
      let hours = Math.floor(time / 3600);
      let minutes = Math.floor((time - hours * 3600) / 60);
      let seconds = Math.floor(time - hours * 3600 - minutes * 60);
      //console.log(`${hours}h ${minutes}m ${seconds}s`);
    });

    launch.on("speed", (speed) => {
      clearInterval(fakeInterval);
      console.log(`${(speed / 1067008).toFixed(2)} Mb/s`);
    });

    launch.on("patch", (patch) => {
      clearInterval(fakeInterval);
      ipcRenderer.send("main-window-progress-load");
      infoStarting.innerHTML = `Atualizando...`;
    });

    launch.on("data", (e) => {
      clearInterval(fakeInterval);
      progressBar.style.display = "none";

      if (configClient.launcher_config.closeLauncher == "close-launcher") {
        ipcRenderer.send("main-window-hide");
      }

      new logger("Minecraft", "#36b030");
      ipcRenderer.send("main-window-progress-load");
      infoStarting.innerHTML = `Iniciando...`;
    });

    launch.on("close", (code) => {
      clearInterval(fakeInterval);
      if (configClient.launcher_config.closeLauncher == "close-launcher") {
        ipcRenderer.send("main-window-show");
      }
      ipcRenderer.send("main-window-progress-reset");
      infoStartingBOX.style.display = "none";
      playInstanceBTN.style.display = "flex";
      infoStarting.innerHTML = `Verificação`;
      new logger(pkg.name, "#7289da");
    });

    launch.on("error", (err) => {
      clearInterval(fakeInterval);
      let popupError = new popup();

      popupError.openPopup({
        title: "Error",
        content: err.error,
        color: "red",
        options: true,
      });

      if (configClient.launcher_config.closeLauncher == "close-launcher") {
        ipcRenderer.send("main-window-show");
      }
      ipcRenderer.send("main-window-progress-reset");
      infoStartingBOX.style.display = "none";
      playInstanceBTN.style.display = "flex";
      infoStarting.innerHTML = `Verificação`;
      new logger(pkg.name, "#7289da");
    });
  }
}
export default Home;
