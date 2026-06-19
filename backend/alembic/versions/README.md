Store Alembic revision files in this folder.

Typical flow:

```powershell
cd backend
python -m alembic revision --autogenerate -m "describe change"
python -m alembic upgrade head
```
