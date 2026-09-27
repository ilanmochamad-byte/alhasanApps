import type { ComponentProps } from 'react';
import { Field } from './ui/app-field';
/** Tidak menyarankan autofill atau pembelajaran teks untuk catatan pembinaan. */
export function PrivateField(props: ComponentProps<typeof Field>) {
  return <Field {...props} accessibilityLabel={props.label} autoCorrect={false} autoComplete="off" textContentType="none" importantForAutofill="no" />;
}
