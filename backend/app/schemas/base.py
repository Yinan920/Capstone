"""Base response model: camelCase JSON matching frontend/src/lib/types.ts."""
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict
from pydantic.alias_generators import to_camel

# UUID (or anything) coerced to str — API ids are strings, per the frontend contract.
Id = Annotated[str, BeforeValidator(str)]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
