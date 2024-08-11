from selenium import webdriver
from selenium.webdriver.common.by import By
import requests
import json
from time import sleep


driver = webdriver.Chrome()

driver.get("https://en.wikipedia.org/wiki/List_of_Singapore_MRT_stations")

rows = [r.text for r in driver.find_elements(By.XPATH, "//table[@class='wikitable sortable jquery-tablesorter']//tr[not(@bgcolor)]/td[1]")]
rows = [r.replace('\n', '').replace('\u2009 CG', '').strip() for r in rows if r != '—']
driver.quit()
output = []
for row in rows:
    code = row.split()[0]
    url = f'https://www.onemap.gov.sg/api/common/elastic/search?searchVal={code} mrt&returnGeom=Y&getAddrDetails=Y&pageNum=1'
    response = requests.request("GET", url).json()
    if response['found'] == 0 or ('MRT STATION' not in response['results'][0]['SEARCHVAL']):
        print(row)
        continue
    res = response['results'][0]
    res["CODE"] = row.split()
    output.append(res)
    sleep(0.1)


with open('data.json', 'w') as f:
    json.dump(output, f)