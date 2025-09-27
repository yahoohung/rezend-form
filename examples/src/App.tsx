import { Box, Flex, Link, VStack } from '@chakra-ui/react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { UncontrolledForm } from './components/UncontrolledForm'
import { ControlledForm } from './components/ControlledForm'
import { ValidationForm } from './components/ValidationForm'
import { ServerUpdatesForm } from './components/ServerUpdatesForm'
import { PerformanceForm } from './components/PerformanceForm'

const Sidebar = () => (
  <Box as="aside" w="250px" p={4} borderRight="1px" borderColor="gray.200">
    <VStack as="nav" align="stretch" spacing={4}>
      <Link as={NavLink} to="/uncontrolled">Uncontrolled Form</Link>
      <Link as={NavLink} to="/controlled">Controlled Form</Link>
      <Link as={NavLink} to="/validation">Validation</Link>
      <Link as={NavLink} to="/server-updates">Server Updates</Link>
      <Link as={NavLink} to="/performance">Performance</Link>
    </VStack>
  </Box>
)

const App = () => {
  return (
    <Flex>
      <Sidebar />
      <Box as="main" flex={1} p={8}>
        <Routes>
          <Route path="/uncontrolled" element={<UncontrolledForm />} />
          <Route path="/controlled" element={<ControlledForm />} />
          <Route path="/validation" element={<ValidationForm />} />
          <Route path="/server-updates" element={<ServerUpdatesForm />} />
          <Route path="/performance" element={<PerformanceForm />} />
        </Routes>
      </Box>
    </Flex>
  )
}

export default App