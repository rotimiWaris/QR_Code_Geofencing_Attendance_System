import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FormInput } from './FormInput';

interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helper?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  (props, ref) => {
    const [show, setShow] = useState(false);

    return (
      <FormInput
        ref={ref}
        type={show ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="text-text-dim hover:text-text-main transition-colors"
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        {...props}
      />
    );
  }
);
PasswordField.displayName = 'PasswordField';
