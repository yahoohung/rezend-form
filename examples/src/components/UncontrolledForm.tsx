import { Box, Button, VStack, Code, Text, chakra } from '@chakra-ui/react';
import { useForm, FormProvider, FormContext } from '../hooks/useForm';
import { FormEvent, useRef, useState, useContext, useEffect } from 'react';

const UncontrolledFormComponent = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const store = useContext(FormContext)!;
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    const unregisterFirst = store.register('firstName', { initialValue: '' });
    const unregisterLast = store.register('lastName', { initialValue: '' });
    return () => {
      unregisterFirst();
      unregisterLast();
    };
  }, [store]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const snapshot = store.read((path) => {
      const element = formRef.current?.elements.namedItem(path) as HTMLInputElement | null;
      return element?.value ?? '';
    });

    const data = {
      firstName: String(snapshot.getValue('firstName') ?? ''),
      lastName: String(snapshot.getValue('lastName') ?? '')
    };
    setFormData(data);
  };

  return (
    <Box>
      <form ref={formRef} onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <Box>
            <Text as="label" display="block" fontWeight="semibold" mb={1}>
              First Name
            </Text>
            <chakra.input
              name="firstName"
              borderColor="gray.200"
              borderWidth="1px"
              borderRadius="md"
              padding="0.5rem"
              width="100%"
            />
          </Box>
          <Box>
            <Text as="label" display="block" fontWeight="semibold" mb={1}>
              Last Name
            </Text>
            <chakra.input
              name="lastName"
              borderColor="gray.200"
              borderWidth="1px"
              borderRadius="md"
              padding="0.5rem"
              width="100%"
            />
          </Box>
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

export const UncontrolledForm = () => {
  const store = useForm();
  return (
    <FormProvider store={store}>
      <UncontrolledFormComponent />
    </FormProvider>
  );
};
