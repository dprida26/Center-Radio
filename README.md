# Tienda Electrodomésticos

Plataforma e-commerce con Django (Backend) + Next.js (Frontend) + PostgreSQL (Base de Datos)

## Estructura

```
Proyecto-Tienda/
├── backend/          # Django REST API
├── frontend/         # Next.js App
├── docker-compose.yml
└── README.md
```

## Requisitos

- Docker y Docker Compose instalados

## Inicio Rápido

### 1. Levanta los contenedores

```bash
cd Proyecto-Tienda
docker-compose up
```

Esto levantará:
- **PostgreSQL** en puerto 5433
- **Django API** en puerto 8000 (http://localhost:8000/api/v1/)
- **Next.js Frontend** en puerto 3000 (http://localhost:3000)

### 2. Crea la estructura de BD y datos iniciales

En otra terminal, ejecuta las migraciones:

```bash
docker-compose exec api python manage.py migrate
```

### 3. Crea un superusuario (opcional, para admin)

```bash
docker-compose exec api python manage.py createsuperuser
```

Accede a http://localhost:8000/admin con las credenciales creadas.

### 4. Carga datos de ejemplo (opcional)

Hay un script en `backend/scripts/load_sample_data.py` que carga datos de ejemplo.

## Acceso

- **Frontend**: http://localhost:3000
- **Backend Admin**: http://localhost:8000/admin
- **API Endpoints**:
  - Productos: http://localhost:8000/api/v1/products/
  - Categorías: http://localhost:8000/api/v1/categories/
  - Promociones: http://localhost:8000/api/v1/promotions/

## Desarrollo

Edita los archivos en `backend/` y `frontend/` directamente. Los cambios se reflejan automáticamente gracias a los volumes en Docker Compose.

## Variables de Entorno

Backend (`backend/.env`):
```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://tienda_user:tienda_pass@db:5432/tienda_db
ALLOWED_HOSTS=localhost,127.0.0.1,api,web
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://web:3000
```

Frontend (heredado de `docker-compose.yml`):
```
NEXT_PUBLIC_API_URL=http://api:8000/api/v1
NODE_ENV=development
```

## Detener los contenedores

```bash
docker-compose down
```

## Troubleshooting

### Error de conexión a BD
Asegúrate de que el servicio `db` está saludable:
```bash
docker-compose ps
```

### Error en migraciones
Intenta manualmente:
```bash
docker-compose exec api python manage.py migrate --run-syncdb
```

### Puerto en uso
Si el puerto 3000 está en uso, cambia en `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Nueva configuración
```
