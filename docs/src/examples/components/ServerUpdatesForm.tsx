import { Box, Button, VStack, Code, Text, HStack, chakra } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useForm, FormProvider, useField, FormContext } from '../hooks/useForm';
import { FormEvent, useState, useContext, useEffect } from 'react';

const highlightFlash = keyframes`
  0% { background-color: rgba(66, 153, 225, 0.35); }
  100% { background-color: transparent; }
`;

const FormField = ({ name, label }: { name: string; label: string }) => {
  const { fieldProps, touched, error, highlightKey } = useField(name, { initialValue: '' });
  const store = useContext(FormContext)!;
  const [isDirty, setIsDirty] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe(
      (s) => s.getDirty(name),
      (dirty) => setIsDirty(dirty)
    );
    return unsubscribe;
  }, [store, name]);

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
      <HStack>
        <Text as="label" flex={1} fontWeight="semibold">
          {label}
        </Text>
        <Text fontSize="sm" color={touched ? 'purple.500' : 'gray.500'}>
          {touched ? 'Touched' : 'Untouched'}
        </Text>
        <Text fontSize="sm" color={isDirty ? 'orange.400' : 'gray.500'}>
          {isDirty ? 'Dirty' : 'Pristine'}
        </Text>
      </HStack>
      <chakra.input
        {...fieldProps}
        aria-invalid={touched && !!error}
        borderColor={touched && !!error ? 'red.400' : 'gray.200'}
        borderWidth="1px"
        borderRadius="md"
        padding="0.5rem"
        width="100%"
        mt={2}
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

const ServerUpdatesFormComponent = () => {
  const store = useContext(FormContext)!;
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      store.setControlledValue('serverTime', new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, [store]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = {
        firstName: (store as any).fields.get('firstName').controlledValue,
        serverTime: (store as any).fields.get('serverTime').controlledValue
    }
    setFormData(data);
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <FormField name="firstName" label="First Name" />
          <FormField name="serverTime" label="Server Time (updates every second)" />
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

export const ServerUpdatesForm = () => {
  const store = useForm();
  return (
    <FormProvider store={store}>
      <ServerUpdatesFormComponent />
    </FormProvider>
  );
};
