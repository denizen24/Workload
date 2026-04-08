import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "/keycloak",
  realm: "workload",
  clientId: "workload-app"
});

export default keycloak;
