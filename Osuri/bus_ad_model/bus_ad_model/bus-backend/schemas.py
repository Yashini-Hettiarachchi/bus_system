from pydantic import BaseModel

class AdCreate(BaseModel):
    title: str
    shop_name: str
    city: str
    time_category: str

class AdResponse(AdCreate):
    id: int
    file_path: str

    class Config:
        from_attributes = True