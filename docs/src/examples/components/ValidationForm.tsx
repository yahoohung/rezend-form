import { Box, Button, VStack, Code, Text, chakra } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useForm, FormProvider, useField, FormContext } from '../hooks/useForm';
import { FormEvent, useState, useContext, useEffect } from 'react';
import { Validator } from '@form/core';

const emailValidator: Validator = (value) => {
    if (typeof value !== 'string' || !value) {
        return { ok: false, message: 'Email is required' };
    }
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
        return { ok: false, message: 'Invalid email address' };
    }
    return { ok: true };
};

const requiredValidator: Validator = (value) => {
    if (typeof value !== 'string' || !value) {
        return { ok: false, message: 'This field is required' };
    }
    return { ok: true };
};

const highlightFlash = keyframes`
  0% { background-color: rgba(66, 153, 225, 0.35); }
  100% { background-color: transparent; }
`;

const FormField = ({ name, label, validator }: { name: string; label: string; validator?: Validator }) => {
  const { fieldProps, touched, error, highlightKey } = useField(name, { initialValue: '', validate: validator });
  const [isHighlighting, setIsHighlighting] = useState(false);

  useEffect(() => {
    if (highlightKey === 0) {
      return;
    }
    setIsHighlighting(false);
    const raf = requestAnimationFrame(() => setIsHighlighting(true));
    return () => cancelAnimationFrame(raf);
  }, [highlightKey]);

  const handleAnimationEnd = () => {
    setIsHighlighting(false);
  };

  return (
    <Box>
      <Text as="label" display="block" fontWeight="semibold" mb={1}>
        {label}
      </Text>
      <chakra.input
        {...fieldProps}
        aria-invalid={touched && !!error}
        borderColor={touched && !!error ? 'red.400' : 'gray.200'}
        borderWidth="1px"
        borderRadius="md"
        padding="0.5rem"
        width="100%"
        animation={isHighlighting ? `${highlightFlash} 2s ease` : undefined}
        animationFillMode={isHighlighting ? 'forwards' : undefined}
        onAnimationEnd={handleAnimationEnd}
      />
      {error ? (
        <Text color="red.500" fontSize="sm" mt={1}>
          {error}
        </Text>
      ) : null}
    </Box>
  );
};

const ValidationFormComponent = () => {
  const store = useContext(FormContext)!;
  const [formData, setFormData] = useState<any>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = await store.validate();
    if (result.ok) {
        const data = {
            name: (store as any).fields.get('name').controlledValue,
            email: (store as any).fields.get('email').controlledValue
        }
        setFormData(data);
    } else {
        setFormData(null);
    }
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <FormField name="name" label="Name" validator={requiredValidator} />
          <FormField name="email" label="Email" validator={emailValidator} />
          <Button type="submit">Submit</Button>
        </VStack>
      </form>
      {formData && (
        <Box mt={4}>
          <Text>Submitted Data:</Text>
          <Code as="pre" p={4} rounded="md">
            {JSON.stringify(formData, null, 2)}
          </Code>
        </Box>
      )}
    </Box>
  );
};

export const ValidationForm = () => {
  const store = useForm();
  return (
    <FormProvider store={store}>
      <ValidationFormComponent />
    </FormProvider>
  );
};
