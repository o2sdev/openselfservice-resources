import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { ThirdPartyJwtAuthProvider } from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [ThirdPartyJwtAuthProvider],
})

export { ThirdPartyJwtAuthProvider }
