프로젝트 시작 시 npm start

혼자 하므로 로컬을 올리고 싶으면
cd daybyday
git add .
git commit -m "커밋 내용"
git push --force origin main

백엔드 서버 킬 때
python -m venv myenv (맨 처음만)
myenv\Scripts\activate
하고 
python manage.py migrate
python manage.py makemigration
python manage.py runserver

백엔드 서버: http://54.180.152.247:8000/

장고 백엔드 관리자 계정

id: admin

password: opensw8