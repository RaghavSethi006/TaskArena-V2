from __future__ import annotations

import json

from sqlalchemy.orm import Session

from features.study_materials.generator import StudyMaterialGenerator
from features.study_materials.models import StudyMaterial


class StudyMaterialService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.generator = StudyMaterialGenerator()

    def get_materials(
        self,
        course_id: int,
        material_type: str | None = None,
    ) -> list[dict]:
        query = self.db.query(StudyMaterial).filter(
            StudyMaterial.course_id == course_id
        )
        if material_type:
            query = query.filter(StudyMaterial.type == material_type)
        materials = query.order_by(StudyMaterial.created_at.desc()).all()

        return [
            {
                "id": m.id,
                "course_id": m.course_id,
                "folder_id": m.folder_id,
                "file_id": m.file_id,
                "type": m.type,
                "title": m.title,
                "content": m.content,
                "created_at": m.created_at,
            }
            for m in materials
        ]

    def get_material(self, material_id: int) -> dict:
        m = self.db.get(StudyMaterial, material_id)
        if not m:
            raise ValueError(f"Study material {material_id} not found")
        return {
            "id": m.id,
            "course_id": m.course_id,
            "folder_id": m.folder_id,
            "file_id": m.file_id,
            "type": m.type,
            "title": m.title,
            "content": m.content,
            "created_at": m.created_at,
        }

    def delete_material(self, material_id: int) -> None:
        m = self.db.get(StudyMaterial, material_id)
        if not m:
            raise ValueError(f"Study material {material_id} not found")
        self.db.delete(m)
        self.db.commit()

    async def generate_material(
        self,
        course_id: int,
        material_type: str,
        n_items: int = 10,
        difficulty: str = "medium",
        folder_id: int | None = None,
        file_id: int | None = None,
        provider: str = "groq",
        progress_callback=None,
    ) -> StudyMaterial:
        generated = await self.generator.generate(
            material_type=material_type,
            course_id=course_id,
            db=self.db,
            n_items=n_items,
            difficulty=difficulty,
            folder_id=folder_id,
            file_id=file_id,
            provider=provider,
            progress_callback=progress_callback,
        )

        title = str(generated.get("title", "")).strip() or f"Generated {material_type.replace('_', ' ').title()}"

        material = StudyMaterial(
            course_id=course_id,
            folder_id=folder_id,
            file_id=file_id,
            type=material_type,
            title=title,
            content=json.dumps(generated),
        )
        self.db.add(material)
        self.db.commit()
        self.db.refresh(material)
        return material
