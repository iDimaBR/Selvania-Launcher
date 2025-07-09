/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const nodeFetch = require("node-fetch");
let url = "http://localhost:3000";
let config = `${url}/config`;

class Config {
  GetConfig() {
    return new Promise((resolve, reject) => {
      nodeFetch(config)
        .then(async (config) => {
          if (config.status === 200) return resolve(config.json());
          else return reject({ error: { code: config.statusText, message: "config not accessible" } });
        })
        .catch((error) => {
          return reject({ error });
        });
    });
  }

  async getInstanceList() {
    let urlInstance = `${url}/files`;
    let instances = await nodeFetch(urlInstance)
      .then((res) => res.json())
      .catch((err) => err);
    let instancesList = [];
    instances = Object.entries(instances);

    for (let [name, data] of instances) {
      let instance = data;
      instance.name = name;
      instancesList.push(instance);
    }
    return instancesList;
  }
}

export default new Config();
