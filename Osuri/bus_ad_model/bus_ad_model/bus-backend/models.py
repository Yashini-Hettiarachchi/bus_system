from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class Advertisement(Base):
    __tablename__ = "advertisements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    shop_name = Column(String)
    city = Column(String)
    time_category = Column(String)
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    media_type = Column(String)  # 'image' or 'video'