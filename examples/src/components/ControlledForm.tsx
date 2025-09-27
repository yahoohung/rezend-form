import { Box, Button, VStack, Code, Text, chakra } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useForm, FormProvider, useField, FormContext } from '../hooks/useForm';
import { FormEvent, useState, useContext, useEffect } from 'react';

const highlightFlash = keyframes`
  0% { background-color: rgba(66, 153, 225, 0.35); }
  100% { background-color: transparent; }
`;

const FormField = ({ name, label }: { name: string; label: string }) => {
  const { fieldProps, touched, error, highlightKey } = useField(name, { initialValue: '' });
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
      {touched && error ? (
        <Text color="red.500" fontSize="sm" mt={1}>
          {error}
        </Text>
      ) : null}
    </Box>
  );
};

const ControlledFormComponent = () => {
  const store = useContext(FormContext)!;
  const [formData, setFormData] = useState<any>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = {
      firstName: String(store.getValue('firstName') ?? ''),
      lastName: String(store.getValue('lastName') ?? '')
    };
    setFormData(data);
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <FormField name="firstName" label="First Name" />
          <FormField name="lastName" label="Last Name" />
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

export const ControlledForm = () => {
  const store = useForm();
  return (
    <FormProvider store={store}>
      <ControlledFormComponent />
    </FormProvider>
  );
};
