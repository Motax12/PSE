# Azure deployment guide

## Prerequisites
- Azure CLI installed: `winget install Microsoft.AzureCLI`
- Docker Desktop installed
- Azure student subscription active

## Deploy to Azure Container Apps

### 1. Login to Azure
```bash
az login
az account set --subscription "your-student-subscription-name"
```

### 2. Create Resource Group
```bash
az group create --name pse-rg --location eastus
```

### 3. Create Container Registry
```bash
az acr create --resource-group pse-rg --name pseregistry --sku Basic
az acr login --name pseregistry
```

### 4. Build and Push Docker Image
```bash
docker build -t pseregistry.azurecr.io/pse-backend:latest .
docker push pseregistry.azurecr.io/pse-backend:latest
```

### 5. Create Container App Environment
```bash
az containerapp env create --name pse-env --resource-group pse-rg --location eastus
```

### 6. Deploy Container App
```bash
az containerapp create \
  --name pse-backend \
  --resource-group pse-rg \
  --environment pse-env \
  --image pseregistry.azurecr.io/pse-backend:latest \
  --target-port 8000 \
  --ingress external \
  --registry-server pseregistry.azurecr.io \
  --cpu 0.5 --memory 1.0Gi
```

## Alternative: Azure App Service

### Deploy Backend
```bash
# Create App Service Plan (Free tier)
az appservice plan create --name pse-plan --resource-group pse-rg --sku F1 --is-linux

# Create Web App
az webapp create --resource-group pse-rg --plan pse-plan --name pse-backend-app --runtime "PYTHON:3.11"

# Deploy code
cd Backend
zip -r ../backend.zip .
az webapp deployment source config-zip --resource-group pse-rg --name pse-backend-app --src backend.zip
```

### Deploy Frontend to Static Web Apps
```bash
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Deploy (from Frontend directory)
cd Frontend
swa deploy --app-name pse-frontend --resource-group pse-rg
```

## Cost Optimization
- Use Free tier Container Apps (2M requests/month)
- Use B1 Basic tier App Service (~$13/month, covered by student credits)
- Static Web Apps Free tier for frontend
