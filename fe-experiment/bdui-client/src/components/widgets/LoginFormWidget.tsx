import { FormEvent, useState } from 'react';
import type { BduiAction } from '../../types/bdui';

type LoginFormWidgetProps = {
  submitAction: BduiAction;
  onSubmit: (action: BduiAction, body: Record<string, string>) => Promise<void>;
};

export function LoginFormWidget(props: LoginFormWidgetProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await props.onSubmit(props.submitAction, { email, password });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="bdui-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="username"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      {errorMessage ? <p className="bdui-error">{errorMessage}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '…' : props.submitAction.label}
      </button>
    </form>
  );
}
