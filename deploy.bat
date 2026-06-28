git checkout main
git add .
git commit -m "%1"

git checkout prod
git merge --ff main
git push

git checkout admin
git merge --ff main
git push

git checkout main
