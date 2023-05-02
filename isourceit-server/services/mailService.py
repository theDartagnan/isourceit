from flask import Flask
from flask_mail import Mail, Message
from utils.Singleton import Singleton


class MailService(metaclass=Singleton):
    def __init__(self, app: Flask = None):
        self.__mail = Mail(app)

    def init_app(self, app: Flask):
        self.__mail.init_app(app)

    @property
    def mail(self):
        return self.__mail

    def send_mail_for_student_composition(self, student_mail: str, exam_name: str, access_url: str) -> None:
        msg = Message(subject="Exam access",
                      recipients=[student_mail])
        msg.body = """
Dear {},

You can now start the exam "{}" through this link: {}.

Sincerely,
The Chat AI exam platform robot.""".format(student_mail, exam_name, access_url)
        msg.html = """
<p>Dear {},
<br/><br/>
You can now start the exam "{}" through this link: <a href={}>{}</a>.
<br/><br/>
Sincerely,
<br/>
The I Source It platform robot.
</p>""".format(student_mail, exam_name, access_url, access_url)
        self.__mail.send(msg)
