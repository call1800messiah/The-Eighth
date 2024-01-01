# TheEighth

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 9.1.7.

## Development server

* Create a `.env` file in the root directory of the project and add the following variables:

```
NG_APP_TENANT=YOUR_TENANT_NAME
```
* Create a `src/environments/environment.ts` file and add the following data according to your Firebase project.

```javascript
export const environment = {
  name: 'dev',
  production: false,
  tenant: process.env.NG_APP_TENANT.trim(),
  tenantData: {
    YOUR_TENANT_NAME: {
      firebase: {
        apiKey: '',
        authDomain: '',
        databaseURL: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
      },
    },
  },
};
```

* Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Deploy

### Prerequisites:
* Create a `src/environments/environment.prod.ts` file and add the following data according to your Firebase project.

```javascript
export const environment = {
  name: 'prod',
  production: true,
  tenant: process.env.NG_APP_TENANT.trim(),
  tenantData: {
    YOUR_TENANT_NAME: {
      firebase: {
        apiKey: '',
        authDomain: '',
        databaseURL: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
      },
    },
  },
};
```
* Run `firebase login` to login to your Firebase account.

### Deployment:
* Run `firebase use YOUR_TENANT_NAME` to select the Firebase project you want to deploy to.
* Ensure that you have the correct environment variables in your `.env` file.
* Run `ng build --configuration=production` to build the project for production.
* Run `firebase deploy` to deploy the project to Firebase Hosting.
