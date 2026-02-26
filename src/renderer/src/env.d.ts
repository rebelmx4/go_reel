import { Api, ElectronAPI } from '../../preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
