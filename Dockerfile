# Stage 1: Build Angular app
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build args for Angular environment (@ngx-env/builder reads NG_APP_* env vars)
ARG NG_APP_TENANT=the-eighth
ARG NG_APP_SUPABASE_ANON_KEY
ENV NG_APP_TENANT=$NG_APP_TENANT
ENV NG_APP_SUPABASE_ANON_KEY=$NG_APP_SUPABASE_ANON_KEY

# Build for production
RUN npx ng build --configuration=production

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/The-Eighth /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
