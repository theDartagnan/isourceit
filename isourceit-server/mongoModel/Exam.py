from datetime import datetime
from typing import TypedDict, NotRequired, List, Dict, Any
import pydantic
from bson import ObjectId

__all__ = ['Exam']


class Exam(TypedDict):
    _id: NotRequired[ObjectId]
    id: NotRequired[pydantic.StrictStr]
    course_id: NotRequired[pydantic.StrictStr]
    name: pydantic.StrictStr
    description: NotRequired[pydantic.StrictStr]
    questions: List[pydantic.StrictStr]
    duration_minutes: pydantic.StrictInt
    created: datetime
    owner_username: pydantic.StrictStr
    authors: List[Dict[pydantic.StrictStr, Any]]  # {username, firstname, lastname...}
    students: List[Dict[pydantic.StrictStr, Any]]  # {username, firstname, lastname...}
    selected_chats: NotRequired[Dict[pydantic.StrictStr, Any]]  # { chat_key, private_key }

    student_generation_auth_url: NotRequired[str] # {not in bd}
