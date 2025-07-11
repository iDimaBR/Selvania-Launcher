/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
const { AZauth, Mojang } = require("minecraft-java-core");
const { ipcRenderer } = require("electron");

import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from "../utils.js";

class Login {
  static id = "login";

  async init(config) {
    this.config = config;
    this.db = new database();

    const loginHome = document.querySelector(".login-home");
    const loginOffline = document.querySelector(".login-offline");
    const cancelHome = document.querySelector(".cancel-home");
    const cancelOffline = document.querySelector(".cancel-offline");
    const connectOffline = document.querySelector(".connect-offline");
    const emailOffline = document.querySelector(".email-offline");

    loginHome.style.display = "block";
    loginOffline.style.display = "none";

    document.querySelector(".connect-home-microsoft").addEventListener("click", () => {
      loginHome.style.display = "none";
      this.getMicrosoft();
    });

    document.querySelector(".connect-home-crack").addEventListener("click", () => {
      loginHome.style.display = "none";
      loginOffline.style.display = "block";
    });

    cancelHome.addEventListener("click", () => {
      loginHome.style.display = "block";
      loginOffline.style.display = "none";
      changePanel("settings");
    });

    cancelOffline.addEventListener("click", () => {
      loginHome.style.display = "block";
      loginOffline.style.display = "none";
    });

    connectOffline.addEventListener("click", async () => {
      const popupLogin = new popup();

      if (emailOffline.value.length < 3) {
        popupLogin.openPopup({
          title: "Error",
          content: "Seu nome de usuário deve ter pelo menos 3 caracteres.",
          options: true,
        });
        return;
      }

      if (emailOffline.value.match(/ /g)) {
        popupLogin.openPopup({
          title: "Error",
          content: "Seu nome de usuário não deve conter espaços.",
          options: true,
        });
        return;
      }

      const existingAccounts = await this.db.readAllData("accounts");
      const alreadyExists = existingAccounts.some((acc) => acc.name.toLowerCase() === emailOffline.value.toLowerCase());
      if (alreadyExists) {
        popupLogin.openPopup({
          title: "Conta já adicionada",
          content: "Esta conta já está salva no launcher.",
          options: true,
        });
        return;
      }

      let MojangConnect = await Mojang.login(emailOffline.value);
      if (MojangConnect.error) {
        popupLogin.openPopup({
          title: "Error",
          content: MojangConnect.message,
          options: true,
        });
        return;
      }

      console.log("MojangConnect", MojangConnect);
      await this.saveData(MojangConnect);
      popupLogin.closePopup();
    });

    if (typeof this.config.online == "string" && this.config.online.match(/^(http|https):\/\/[^ "]+$/)) {
      loginHome.style.display = "none";
      this.getAZauth();
    }
  }

  async getMicrosoft() {
    console.log("Iniciando login Microsoft...");
    let popupLogin = new popup();

    popupLogin.openPopup({
      title: "Conexão",
      content: "Por favor, aguarde...",
      color: "var(--color)",
    });

    ipcRenderer
      .invoke("Microsoft-window", this.config.client_id)
      .then(async (account_connect) => {
        if (account_connect == "cancel" || !account_connect) {
          popupLogin.closePopup();
          document.querySelector(".login-home").style.display = "block";
          return;
        } else {
          const existingAccounts = await this.db.readAllData("accounts");
          const alreadyExists = existingAccounts.some((acc) => acc.name.toLowerCase() === account_connect.name.toLowerCase());
          if (alreadyExists) {
            popupLogin.openPopup({
              title: "Conta já adicionada",
              content: "Esta conta já está salva no launcher.",
              options: true,
            });
            changePanel("home");
            return;
          }

          await this.saveData(account_connect);
          popupLogin.closePopup();
        }
      })
      .catch((err) => {
        popupLogin.openPopup({
          title: "Error",
          content: err,
          options: true,
        });
      });
  }

  async getCrack() {
    const popupLogin = new popup();
    const emailOffline = document.querySelector(".email-offline");

    document.querySelector(".connect-offline").addEventListener("click", async () => {
      if (emailOffline.value.length < 3) {
        popupLogin.openPopup({
          title: "Error",
          content: "Seu nome de usuário deve ter pelo menos 3 caracteres.",
          options: true,
        });
        return;
      }

      if (emailOffline.value.match(/ /g)) {
        popupLogin.openPopup({
          title: "Error",
          content: "Seu nome de usuário não deve conter espaços..",
          options: true,
        });
        return;
      }

      const existingAccounts = await this.db.readAllData("accounts");
      const alreadyExists = existingAccounts.some((acc) => acc.name.toLowerCase() === emailOffline.value.toLowerCase());
      if (alreadyExists) {
        popupLogin.openPopup({
          title: "Conta já adicionada",
          content: "Esta conta já está salva no launcher.",
          options: true,
        });
        return;
      }

      let MojangConnect = await Mojang.login(emailOffline.value);
      if (MojangConnect.error) {
        popupLogin.openPopup({
          title: "Error",
          content: MojangConnect.message,
          options: true,
        });
        return;
      }
      console.log("MojangConnect", MojangConnect);
      await this.saveData(MojangConnect);
      popupLogin.closePopup();
    });
  }

  async getAZauth() {
    console.log("Iniciando login AZAuth...");
    let AZauthClient = new AZauth(this.config.online);
    let PopupLogin = new popup();
    let loginAZauth = document.querySelector(".login-AZauth");
    let loginAZauthA2F = document.querySelector(".login-AZauth-A2F");

    loginAZauth.style.display = "block";

    const AZauthEmail = document.querySelector(".email-AZauth");
    const AZauthPassword = document.querySelector(".password-AZauth");
    const AZauthA2F = document.querySelector(".A2F-AZauth");
    const connectAZauthA2F = document.querySelector(".connect-AZauth-A2F");
    const AZauthConnectBTN = document.querySelector(".connect-AZauth");
    const AZauthCancelA2F = document.querySelector(".cancel-AZauth-A2F");

    AZauthConnectBTN.addEventListener("click", async () => {
      PopupLogin.openPopup({
        title: "Connexion en cours...",
        content: "Veuillez patienter...",
        color: "var(--color)",
      });

      if (AZauthEmail.value == "" || AZauthPassword.value == "") {
        PopupLogin.openPopup({
          title: "Error",
          content: "Veuillez remplir tous les champs.",
          options: true,
        });
        return;
      }

      let AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value);

      if (AZauthConnect.error) {
        PopupLogin.openPopup({
          title: "Error",
          content: AZauthConnect.message,
          options: true,
        });
        return;
      } else if (AZauthConnect.A2F) {
        loginAZauthA2F.style.display = "block";
        loginAZauth.style.display = "none";
        PopupLogin.closePopup();

        AZauthCancelA2F.addEventListener("click", () => {
          loginAZauthA2F.style.display = "none";
          loginAZauth.style.display = "block";
        });

        connectAZauthA2F.addEventListener("click", async () => {
          PopupLogin.openPopup({
            title: "Connexion en cours...",
            content: "Veuillez patienter...",
            color: "var(--color)",
          });

          if (AZauthA2F.value == "") {
            PopupLogin.openPopup({
              title: "Error",
              content: "Veuillez entrer le code A2F.",
              options: true,
            });
            return;
          }

          AZauthConnect = await AZauthClient.login(AZauthEmail.value, AZauthPassword.value, AZauthA2F.value);

          if (AZauthConnect.error) {
            PopupLogin.openPopup({
              title: "Error",
              content: AZauthConnect.message,
              options: true,
            });
            return;
          }

          await this.saveData(AZauthConnect);
          PopupLogin.closePopup();
        });
      } else {
        await this.saveData(AZauthConnect);
        PopupLogin.closePopup();
      }
    });
  }

  async saveData(connectionData) {
    let configClient = await this.db.readData("configClient");
    let account = await this.db.createData("accounts", connectionData);
    let instanceSelect = configClient.instance_selct;
    let instancesList = await config.getInstanceList();
    configClient.account_selected = account.ID;

    for (let instance of instancesList) {
      if (instance.whitelistActive) {
        let whitelist = instance.whitelist.find((w) => w == account.name);
        if (whitelist !== account.name) {
          if (instance.name == instanceSelect) {
            let newInstanceSelect = instancesList.find((i) => !i.whitelistActive);
            configClient.instance_selct = newInstanceSelect.name;
            await setStatus(newInstanceSelect.status);
          }
        }
      }
    }

    await this.db.updateData("configClient", configClient);
    await addAccount(account);
    await accountSelect(account);
    changePanel("home");
  }
}
export default Login;
