/**
 * FieldError — mensaje de error animado bajo un campo de formulario.
 * Si `message` está vacío, no renderiza nada (el animation replay se
 * consigue desmontando/montando el componente al aparecer el error).
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="field-error">{message}</p>;
}
