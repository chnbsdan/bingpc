import os
import json
import requests
from datetime import datetime, timedelta

# 配置 - 改成 docs/picture/
PICTURE_DIR = "./docs/picture"
DOCS_JSON = "./docs/images.json"
KEEP_DAYS = 30

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def download_image(url, save_path):
    """下载图片到本地"""
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(resp.content)
            print(f"下载成功: {save_path}")
            return True
    except Exception as e:
        print(f"下载失败 {url}: {e}")
    return False

def get_bing_images(n=8):
    """从 Bing API 获取图片信息"""
    url = f"https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n={n}&mkt=zh-CN"
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json().get('images', [])

def clean_old_images():
    """删除超过30天的图片"""
    if not os.path.exists(PICTURE_DIR):
        return
    
    cutoff = datetime.now() - timedelta(days=KEEP_DAYS)
    for filename in os.listdir(PICTURE_DIR):
        if not filename.endswith('.jpg'):
            continue
        try:
            date_str = filename.replace('.jpg', '')
            file_date = datetime.strptime(date_str, '%Y-%m-%d')
            if file_date < cutoff:
                os.remove(os.path.join(PICTURE_DIR, filename))
                print(f"删除旧图片: {filename}")
        except Exception as e:
            print(f"处理文件失败 {filename}: {e}")

def main():
    print("开始生成图片...")
    ensure_dir(PICTURE_DIR)
    
    # 获取最近 30 天的图片
    all_images = []
    for idx in range(0, 30, 8):
        try:
            images = get_bing_images(8)
            all_images.extend(images)
        except Exception as e:
            print(f"获取图片失败: {e}")
            break
    
    # 下载图片
    downloaded = []
    for img in all_images:
        date = img.get('enddate', '')
        if not date:
            continue
        
        date_str = f"{date[:4]}-{date[4:6]}-{date[6:8]}"
        filename = f"{date_str}.jpg"
        save_path = os.path.join(PICTURE_DIR, filename)
        
        if os.path.exists(save_path):
            print(f"图片已存在: {filename}")
            downloaded.append({
                'date': date_str,
                'path': f'/picture/{filename}',
                'copyright': img.get('copyright', '')
            })
            continue
        
        urlbase = img.get('urlbase', '')
        if urlbase:
            image_url = f"https://www.bing.com{urlbase}_1920x1080.jpg"
            if download_image(image_url, save_path):
                downloaded.append({
                    'date': date_str,
                    'path': f'/picture/{filename}',
                    'copyright': img.get('copyright', '')
                })
    
    # 清理旧图片
    clean_old_images()
    
    # 生成图片索引
    with open('./docs/picture/index.json', 'w', encoding='utf-8') as f:
        json.dump(downloaded, f, ensure_ascii=False, indent=2)
    
    print(f"完成！共下载 {len(downloaded)} 张图片")

if __name__ == '__main__':
    main()
