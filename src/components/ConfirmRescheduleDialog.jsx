import React from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Button } from './ui/button'

export default function ConfirmRescheduleDialog({
  open,
  company = '',
  onCancel,
  onConfirm,
}) {
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-[1250]">
      <div className="fixed inset-0 bg-gray-900/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900 tracking-tight">
              Marcar como Reprogramada
            </DialogTitle>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cerrar"
              className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors border-0 bg-transparent text-lg"
            >
              ×
            </button>
          </div>

          <div className="px-5 py-4 grid gap-2">
            <p className="text-[13px] text-gray-700 m-0">
              La reunión{company ? <> con <strong className="font-semibold text-gray-900">{company}</strong></> : ''} se marcará como <strong className="font-semibold text-gray-900">Reprogramada</strong>.
            </p>
          </div>

          <div className="border-t border-gray-100 px-5 py-3.5 flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={onConfirm}>Sí, marcar como Reprogramada</Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
