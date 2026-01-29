@echo off
chcp 65001 >nul
tree.com src /f /a >tree_src.txt
powershell -command "(gc tree_src.txt | select -Skip 1) | sc tree_src.txt"
