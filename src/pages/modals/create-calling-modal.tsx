import FormTitle from 'utilities/form-title';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import type { IEditCalling } from 'utils/auth';
import { trpc } from 'utils/trpc';
import 'react-datepicker/dist/react-datepicker.css';

export default function CreateCallingModal({
  isOpen,
  onClose,
  selectedCalling,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedCalling: IEditCalling | null;
}) {
  const [requirement, setRequirement] = useState<string>('');
  const [minExpWork, setMinExpWork] = useState<string>('');
  const [resultAt, setResultAt] = useState<Date | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const utils = trpc.useContext();

  const createCalling = trpc.calling.createCalling.useMutation({
    onSettled: async () => {
      await utils.calling.findYourCallings.invalidate();
    },
  });

  const updateCalling = trpc.calling.updateCalling.useMutation({
    onSettled: async () => {
      await utils.calling.findYourCallings.invalidate();
    },
  });

  useEffect(() => {
    if (selectedCalling !== null) {
      setRequirement(selectedCalling.requirement);
      setMinExpWork(selectedCalling.min_exp_work.toString());
      setResultAt(
        selectedCalling.resultAt ? new Date(selectedCalling.resultAt) : null,
      );
      setExpiresAt(
        selectedCalling.expiresAt ? new Date(selectedCalling.expiresAt) : null,
      );
    }
  }, [selectedCalling]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (/^\d*\.?\d*$/.test(value)) {
      setMinExpWork(value);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Validación: la fecha de expiración debe ser al menos dos días mayor que la fecha de resultados
    if (resultAt && expiresAt) {
      const minimumExpirationDate = new Date(resultAt);
      minimumExpirationDate.setDate(minimumExpirationDate.getDate() + 2);

      if (expiresAt < minimumExpirationDate) {
        alert(
          'La fecha de expiración debe ser al menos dos días después de la fecha de resultados.',
        );
        return;
      }
    }
    const callingData = {
      requirement: requirement,
      min_exp_work: parseInt(minExpWork),
      resultAt: resultAt!,
      expiresAt: expiresAt!,
    };

    if (selectedCalling !== null) {
      updateCalling.mutate({
        id: selectedCalling.id,
        ...callingData,
      });
    } else {
      createCalling.mutate(callingData);
    }

    onClose();
    setRequirement('');
    setMinExpWork('');
    setResultAt(null);
    setExpiresAt(null);
  };

  if (!isOpen) {
    return null;
  }

  const overlayClassName = isOpen
    ? 'fixed top-0 left-0 w-full h-full rounded-lg bg-gray-800 opacity-60 z-20'
    : 'hidden';

  return (
    <>
      <div className={overlayClassName}></div>
      <form
        onSubmit={handleSubmit}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform z-40 w-11/12 md:w-auto overflow-auto rounded-lg bg-white p-9"
      >
        <div className="flex flex-col gap-2">
          <FormTitle text="Crear convocatoria" />
          <p className="text-justify text-base font-light text-gray-500">
            Complete los campos presentados a continuación:
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-black text-sm font-bold">
              Requerimiento:
            </label>
            <input
              type="text"
              className="focus:shadow-outline w-full appearance-none rounded-lg border px-2 py-1 leading-tight text-gray-700 focus:outline-none"
              value={requirement}
              onChange={(event) => setRequirement(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-black text-sm font-bold">
              Años de experiencia laboral (en números):
            </label>
            <input
              type="text"
              className="focus:shadow-outline w-full appearance-none rounded-lg border px-2 py-1 leading-tight text-gray-700 focus:outline-none"
              value={minExpWork}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-black text-sm font-bold">
              Fecha de Resultados:
            </label>
            <ReactDatePicker
              selected={resultAt}
              onChange={(date) => setResultAt(date)}
              className="focus:shadow-outline w-full appearance-none rounded-lg border px-2 py-1 leading-tight text-gray-700 focus:outline-none"
              dateFormat="dd/MM/yyyy"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-black text-sm font-bold">
              Fecha de Expiración:
            </label>
            <ReactDatePicker
              selected={expiresAt}
              onChange={(date) => setExpiresAt(date)}
              className="focus:shadow-outline w-full appearance-none rounded-lg border px-2 py-1 leading-tight text-gray-700 focus:outline-none"
              dateFormat="dd/MM/yyyy"
              required
            />
          </div>

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
              Guardar
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
