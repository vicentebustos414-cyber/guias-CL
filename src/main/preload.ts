import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  guias: {
    list:        (filtro?: string)          => ipcRenderer.invoke('guias:list', filtro),
    get:         (id: number)               => ipcRenderer.invoke('guias:get', id),
    create:      (guia: any)                => ipcRenderer.invoke('guias:create', guia),
    update:      (guia: any)                => ipcRenderer.invoke('guias:update', guia),
    delete:      (id: number)               => ipcRenderer.invoke('guias:delete', id),
    nextNumero:  ()                         => ipcRenderer.invoke('guias:next-numero'),
    exportPath:  (numeroGuia: string)       => ipcRenderer.invoke('guias:export-path', numeroGuia),
    savePdf:     (buf: number[], path: string) => ipcRenderer.invoke('guias:save-pdf', buf, path),
  },
  viajes: {
    list:   (filtro?: string) => ipcRenderer.invoke('viajes:list', filtro),
    get:    (id: number)      => ipcRenderer.invoke('viajes:get', id),
    create: (v: any)          => ipcRenderer.invoke('viajes:create', v),
    update: (v: any)          => ipcRenderer.invoke('viajes:update', v),
    delete: (id: number)      => ipcRenderer.invoke('viajes:delete', id),
  },
  config: {
    get:  ()         => ipcRenderer.invoke('config:get'),
    save: (cfg: any) => ipcRenderer.invoke('config:save', cfg),
  },
});
