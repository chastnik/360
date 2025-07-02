#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Универсальный скрипт запуска системы 360-градусной оценки персонала
Поддерживает Windows, Linux, macOS

Copyright (c) 2025 Стас Чашин для БИТ.Цифра
Все права защищены
"""

import os
import sys
import subprocess
import platform
import shutil
import argparse
import json
import time
import signal
from pathlib import Path
from typing import Optional, List

# Цвета для консоли
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    NC = '\033[0m'  # No Color

    @classmethod
    def disable_on_windows(cls):
        """Отключить цвета на Windows если не поддерживается"""
        if platform.system() == "Windows":
            try:
                import colorama
                colorama.init()
            except ImportError:
                # Отключить цвета если colorama не установлена
                for attr in dir(cls):
                    if not attr.startswith('_') and attr != 'disable_on_windows':
                        setattr(cls, attr, '')

# Инициализация цветов
Colors.disable_on_windows()

def log_info(message: str):
    print(f"{Colors.BLUE}[INFO]{Colors.NC} {message}")

def log_success(message: str):
    print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {message}")

def log_warning(message: str):
    print(f"{Colors.YELLOW}[WARNING]{Colors.NC} {message}")

def log_error(message: str):
    print(f"{Colors.RED}[ERROR]{Colors.NC} {message}")

def log_header(message: str):
    print(f"{Colors.PURPLE}[HEADER]{Colors.NC} {message}")

class ServiceManager:
    def __init__(self):
        self.system = platform.system()
        self.node_cmd = "node"
        self.npm_cmd = "npm"
        self.npx_cmd = "npx"
        
    def check_command(self, command: str) -> bool:
        """Проверить доступность команды"""
        return shutil.which(command) is not None
    
    def run_command(self, command: List[str], check: bool = True, capture_output: bool = False) -> subprocess.CompletedProcess:
        """Выполнить команду с обработкой ошибок"""
        try:
            if capture_output:
                result = subprocess.run(command, check=check, capture_output=True, text=True)
            else:
                result = subprocess.run(command, check=check)
            return result
        except subprocess.CalledProcessError as e:
            log_error(f"Ошибка выполнения команды: {' '.join(command)}")
            if capture_output and e.stdout:
                log_error(f"Stdout: {e.stdout}")
            if capture_output and e.stderr:
                log_error(f"Stderr: {e.stderr}")
            raise
    
    def check_node(self) -> bool:
        """Проверить Node.js"""
        if not self.check_command(self.node_cmd):
            log_error("Node.js не установлен!")
            log_info("Установите Node.js версии 18+ с https://nodejs.org/")
            return False
        
        try:
            result = self.run_command([self.node_cmd, "--version"], capture_output=True)
            version = result.stdout.strip().replace('v', '')
            major_version = int(version.split('.')[0])
            
            if major_version < 18:
                log_error(f"Требуется Node.js версии 18+, установлена версия {version}")
                return False
            
            log_success(f"Node.js версии {version} найдена")
            return True
        except Exception as e:
            log_error(f"Ошибка проверки Node.js: {e}")
            return False
    
    def check_npm(self) -> bool:
        """Проверить npm"""
        if not self.check_command(self.npm_cmd):
            log_error("npm не установлен!")
            return False
        
        try:
            result = self.run_command([self.npm_cmd, "--version"], capture_output=True)
            version = result.stdout.strip()
            log_success(f"npm версии {version} найдена")
            return True
        except Exception as e:
            log_error(f"Ошибка проверки npm: {e}")
            return False
    
    def install_dependencies(self) -> bool:
        """Установить зависимости"""
        if not Path("node_modules").exists():
            log_info("Установка зависимостей...")
            try:
                self.run_command([self.npm_cmd, "install"])
                log_success("Зависимости установлены")
                return True
            except subprocess.CalledProcessError:
                log_error("Ошибка при установке зависимостей")
                return False
        else:
            log_info("Зависимости уже установлены, проверяем обновления...")
            try:
                self.run_command([self.npm_cmd, "ci"])
                log_success("Зависимости обновлены")
                return True
            except subprocess.CalledProcessError:
                log_warning("Ошибка при обновлении зависимостей, продолжаю...")
                return True
    
    def setup_environment(self) -> bool:
        """Настроить переменные окружения"""
        env_file = Path(".env")
        if not env_file.exists():
            log_warning(".env файл не найден, создаю с базовыми настройками...")
            env_content = """# База данных
DATABASE_URL="file:./dev.db"

# Mattermost интеграция (опционально)
MATTERMOST_URL=""
MATTERMOST_TOKEN=""

# Настройки приложения
NODE_ENV="development"
PORT=3000

# Секретный ключ для сессий
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
"""
            env_file.write_text(env_content, encoding='utf-8')
            log_success(".env файл создан")
        else:
            log_success(".env файл найден")
        return True
    
    def setup_database(self, force_seed: bool = False) -> bool:
        """Настроить базу данных"""
        log_info("Настройка базы данных...")
        
        try:
            # Генерация Prisma клиента
            self.run_command([self.npx_cmd, "prisma", "generate"])
            
            db_file = Path("prisma/dev.db")
            
            # Пересоздание базы данных если нужно
            if force_seed and db_file.exists():
                log_warning("Пересоздание базы данных...")
                db_file.unlink()
            
            if not db_file.exists():
                log_info("Создание базы данных...")
                self.run_command([self.npx_cmd, "prisma", "db", "push"])
                
                log_info("Заполнение базы данных тестовыми данными...")
                self.run_command([self.npx_cmd, "prisma", "db", "seed"])
                
                log_success("База данных создана и заполнена")
            else:
                log_info("База данных уже существует, применяю изменения...")
                self.run_command([self.npx_cmd, "prisma", "db", "push"])
                log_success("База данных обновлена")
            
            return True
        except subprocess.CalledProcessError:
            log_error("Ошибка при настройке базы данных")
            return False
    
    def check_port(self, port: int) -> bool:
        """Проверить доступность порта"""
        import socket
        
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            result = sock.connect_ex(('localhost', port))
            if result == 0:
                log_warning(f"Порт {port} уже занят!")
                
                if self.system == "Windows":
                    try:
                        result = subprocess.run(["netstat", "-ano"], capture_output=True, text=True)
                        lines = [line for line in result.stdout.split('\n') if f":{port} " in line and "LISTENING" in line]
                        if lines:
                            log_info("Процессы на этом порту:")
                            for line in lines:
                                print(f"  {line.strip()}")
                    except:
                        pass
                else:
                    try:
                        result = subprocess.run(["lsof", f"-i:{port}"], capture_output=True, text=True)
                        if result.stdout:
                            log_info("Процессы на этом порту:")
                            print(result.stdout)
                    except:
                        pass
                
                response = input("Хотите попробовать другой порт? (y/N): ")
                return response.lower() == 'y'
            return True
    
    def start_development(self, port: int = 3000) -> bool:
        """Запуск в режиме разработки"""
        log_info("Запуск в режиме разработки...")
        
        # Установка переменной окружения для порта
        env = os.environ.copy()
        env['PORT'] = str(port)
        
        try:
            subprocess.run([self.npm_cmd, "run", "dev"], env=env)
            return True
        except KeyboardInterrupt:
            log_info("Получен сигнал остановки...")
            return True
        except subprocess.CalledProcessError:
            log_error("Ошибка при запуске в режиме разработки")
            return False
    
    def start_production(self, port: int = 3000) -> bool:
        """Запуск в продакшн режиме"""
        log_info("Сборка приложения для продакшн...")
        
        # Установка переменной окружения для порта
        env = os.environ.copy()
        env['PORT'] = str(port)
        env['NODE_ENV'] = 'production'
        
        try:
            # Сборка
            self.run_command([self.npm_cmd, "run", "build"])
            
            log_info("Запуск в продакшн режиме...")
            subprocess.run([self.npm_cmd, "start"], env=env)
            return True
        except KeyboardInterrupt:
            log_info("Получен сигнал остановки...")
            return True
        except subprocess.CalledProcessError:
            log_error("Ошибка при запуске в продакшн режиме")
            return False

def main():
    parser = argparse.ArgumentParser(
        description="Универсальный скрипт запуска системы 360-градусной оценки персонала",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:
  python quick-start.py                    # Запуск в режиме разработки
  python quick-start.py --prod             # Запуск в продакшн режиме
  python quick-start.py --port 8080        # Запуск на порту 8080
  python quick-start.py --check            # Только проверка зависимостей
  python quick-start.py --setup            # Только настройка
  python quick-start.py --force-seed       # Пересоздать базу данных
        """
    )
    
    parser.add_argument('-d', '--dev', action='store_true', 
                       help='Запуск в режиме разработки (по умолчанию)')
    parser.add_argument('-p', '--prod', action='store_true',
                       help='Запуск в продакшн режиме')
    parser.add_argument('-c', '--check', action='store_true',
                       help='Только проверка зависимостей')
    parser.add_argument('-s', '--setup', action='store_true',
                       help='Только настройка без запуска')
    parser.add_argument('--port', type=int, default=3000,
                       help='Порт для запуска (по умолчанию: 3000)')
    parser.add_argument('--skip-deps', action='store_true',
                       help='Пропустить установку зависимостей')
    parser.add_argument('--force-seed', action='store_true',
                       help='Пересоздать базу данных с тестовыми данными')
    parser.add_argument('--version', action='version', version='360 Feedback System v1.0.0')
    
    args = parser.parse_args()
    
    # Заголовок
    print(f"{Colors.CYAN}{'='*60}{Colors.NC}")
    print(f"{Colors.WHITE}🚀 Система 360-градусной оценки персонала{Colors.NC}")
    print(f"{Colors.CYAN}{'='*60}{Colors.NC}")
    print()
    
    # Определение режима
    mode = 'prod' if args.prod else 'dev'
    log_info(f"Платформа: {platform.system()} {platform.machine()}")
    log_info(f"Режим: {mode}, Порт: {args.port}")
    print()
    
    manager = ServiceManager()
    
    # Проверки
    log_header("Проверка зависимостей")
    if not manager.check_node() or not manager.check_npm():
        return 1
    
    if args.check:
        log_success("Все проверки пройдены!")
        return 0
    
    # Настройка
    log_header("Настройка окружения")
    
    if not manager.setup_environment():
        return 1
    
    if not args.skip_deps:
        if not manager.install_dependencies():
            return 1
    
    if not manager.setup_database(args.force_seed):
        return 1
    
    if args.setup:
        log_success("Настройка завершена!")
        return 0
    
    # Проверка порта
    log_header("Проверка доступности порта")
    port = args.port
    while not manager.check_port(port):
        try:
            port = int(input(f"Введите другой порт (текущий: {port}): "))
        except (ValueError, KeyboardInterrupt):
            log_error("Отменено пользователем")
            return 1
    
    # Запуск
    print()
    log_success("🎉 Настройка завершена! Запуск приложения...")
    log_info(f"Приложение будет доступно по адресу: http://localhost:{port}")
    log_info("Для остановки нажмите Ctrl+C")
    print()
    
    # Обработка сигналов
    def signal_handler(signum, frame):
        print()
        log_info("Получен сигнал остановки...")
        log_info("Завершение работы...")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, signal_handler)
    
    # Запуск приложения
    if mode == 'prod':
        success = manager.start_production(port)
    else:
        success = manager.start_development(port)
    
    return 0 if success else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        log_info("Завершение работы...")
        sys.exit(0)
    except Exception as e:
        log_error(f"Неожиданная ошибка: {e}")
        sys.exit(1) 