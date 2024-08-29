import { FormEvent } from 'react';
import FormTitle from 'utilities/form-title';
import { trpc } from 'utils/trpc';
import 'react-datepicker/dist/react-datepicker.css';
export default function ConfirmationModal2({
  isOpen,
  onClose,
  applicationId,
  testResult,
  onClose2,
}: {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  testResult: Record<string, number>;
  onClose2: () => void;
}) {
  const utils = trpc.useContext();

  const testApplicant = trpc.application.finalTestApplicant.useMutation({
    onSettled: async () => {
      await utils.application.getApplicantsByCalling.invalidate();
    },
  });

  //Estilizado del fondo detrás del modal. Evita al usuario salirse del modal antes de elegir alguna opción
  const overlayClassName = isOpen
    ? 'fixed top-0 left-0 w-full h-full rounded-lg bg-gray-800 opacity-60 z-20'
    : 'hidden';

  if (!isOpen) {
    return null; // No renderizar el modal si no está abierto
  }
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (applicationId) {
      testApplicant.mutate({
        id: applicationId,
        quest1: testResult.quest1,
        quest2: testResult.quest2,
        quest3: testResult.quest3,
        quest4: testResult.quest4,
        quest5: testResult.quest5,
        quest6: testResult.quest6,
        quest7: testResult.quest7,
        quest8: testResult.quest8,
      });
      onClose();
      onClose2();
    }
  };
  return (
    <>
      {isOpen && (
        <>
          {/* Fondo borroso y no interactivo */}
          <div className={overlayClassName}></div>
          <form
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform z-30 w-11/12 md:w-auto overflow-auto rounded-lg bg-white p-9"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-2">
              <FormTitle text="Confirmar calificación de participante" />
              <p className="text-justify text-base font-light text-gray-500">
                De clic en aceptar para enviar su calificación.
              </p>

              <div className="mt-4 pt-4 flex flex-row justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  className="rounded-lg border bg-gray-500 px-4 py-1 text-base font-medium text-white"
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg border bg-sky-500 px-4 py-1 text-base font-medium text-white"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}
