# Rezend Form

[![npm version](https://img.shields.io/npm/v/rezend-form.svg)](https://www.npmjs.com/package/rezend-form)
[![npm downloads](https://img.shields.io/npm/dm/rezend-form.svg)](https://www.npmjs.com/package/rezend-form)
[![license](https://img.shields.io/npm/l/rezend-form.svg)](https://github.com/your-username/rezend-form/blob/main/LICENSE)

Rezend Form is a high-performance, lightweight, and extensible form state management library for JavaScript and TypeScript applications.

## Features

- **Lightweight:** The core library is small and has zero dependencies.
- **Performant:** Optimized for minimal re-renders and efficient updates.
- **Extensible:** A plugin-based architecture allows for easy extension and customization.
- **Type-Safe:** Written in TypeScript for a great developer experience.
- **Framework Agnostic:** The core library can be used with any framework.

## Packages

This repository is a monorepo containing the following packages:

| Package | Description |
| --- | --- |
| [`@form/core`](/packages/core) | Plain JavaScript form store with TypeScript types. |
| [`@form/react`](/packages/react) | React bindings for the Rezend form store. |
| [`@form/plugins`](/packages/plugins) | Optional plugins for the Rezend form store. |

## Installation

To install Rezend Form, use your favorite package manager:

```bash
pnpm add @form/core
```

## Usage

Here is a basic example of how to use the core library:

```typescript
import { createFormStore } from '@form/core';

const form = createFormStore();

form.register('name', {
  initialValue: 'John Doe',
});

form.subscribe(
  (snapshot) => snapshot.getValue('name'),
  (name) => {
    console.log('Name changed:', name);
  }
);

form.setControlledValue('name', 'Jane Doe');
```

## API

### `createFormStore(options)`

Creates a new form store instance.

- `options.middleware`: An array of middleware to apply to the store.
- `options.plugins`: An array of plugins to extend the store.

### `formStore`

The `formStore` instance has the following methods:

- `register(path, options)`: Registers a field with the store.
- `markTouched(path)`: Marks a field as touched.
- `markDirty(path)`: Marks a field as dirty.
- `setControlledValue(path, value)`: Sets the value of a controlled field.
- `validate(path)`: Validates a field or the entire form.
- `getTouched(path)`: Gets the touched state of a field.
- `getDirty(path)`: Gets the dirty state of a field.
- `getError(path)`: Gets the error message of a field.
- `getValue(path)`: Gets the value of a field.
- `read(getDomValue)`: Reads values from an external source for uncontrolled fields.
- `subscribe(selector, callback)`: Subscribes to changes in the store.
- `watch(pattern, callback)`: Watches for changes on paths matching a wildcard pattern.
- `destroy()`: Destroys the store and cleans up resources.

## License

[MIT](/LICENSE)
