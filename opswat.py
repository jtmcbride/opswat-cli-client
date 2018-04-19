import requests
import os
import sys
import hashlib
import time


class OPSWATFileUpload():

	def __init__(self):
		self.http = requests
		api_key = os.environ.get('OPSWAT_API_KEY')
		if api_key:
			self.api_key = api_key
		else:
			raise Exception("OPSWAT_API_KEY environment variable must be set")
		self.default_headers = {
			'apikey': self.api_key
		}


	def calculate_file_hash(self, file):
		self.current_file_contents = file.read()
		self.file.close()
		self.current_file_hash = hashlib.sha1(self.current_file_contents).hexdigest().upper()
		return self.current_file_hash

	def get_report_by_hash(self):
		file_hash =  self.calculate_file_hash(self.file)
		res = requests.get(
			'https://api.metadefender.com/v2/hash/%s' % file_hash, 
			headers=self.default_headers
			)
		return res

	def upload_file(self):
		headers = {'filename': self.current_filename}
		headers.update(self.default_headers)
		res = requests.post(
			'https://api.metadefender.com/v2/file', 
			data={'file': self.current_file_contents}, 
			headers=headers
			)
		return res


	def cli_file_upload(self):
		args = sys.argv
		self.current_filename = args[1]
		wait_time = int(args[2]) if len(args) > 2 else 5
		self.file = open(self.current_filename, 'rb')
		report = self.get_report_by_hash()
		report_json = report.json()
		if self.current_file_hash in report_json and report_json[self.current_file_hash] == 'Not Found':
			scan_file = self.upload_file()
			if scan_file.status_code >= 400:
				raise Exception("%s: %s" % (scan_file.status_code, scan_file.reason))
			else:
				self.current_data_id = scan_file.json()['data_id']

			report = requests.get(
				'https://api.metadefender.com/v2/file/%s' % self.current_data_id, 
				headers=self.default_headers
				)
			status = report.status_code
			while status < 400 and report.json()['original_file']['progress_percentage'] != 100:
				print('Scan not complete. Retrying in %s seconds...' % wait_time)
				time.sleep(wait_time)
				report = requests.get(
					'https://api.metadefender.com/v2/file/%s' % self.current_data_id,
					headers=self.default_headers
					)
				status = report.status_code
		if status >= 400:
			raise Exception("%s: %s" % (status, report.reason))
		report_json = report.json()
		print(self.format_report(report_json))
		return report_json


	def format_report(self, report_json):
		formatted = "\n\n"
		results = report_json['scan_results']
		formatted += 'filename: %s\n' % report_json['file_info']['display_name']
		formatted += 'overall_status: %s\n\n' % results['scan_all_result_a']
		for engine, res in results['scan_details'].items():
			formatted += "Engine: %s\n" % engine
			threat = res['threat_found'] if res['threat_found']  != '' else 'Clean'
			formatted += 'threat_found: %s\n' % threat
			formatted += 'scan_result: %s\n' % res['scan_result_i']
			formatted += 'def_time: %s\n\n' % res['def_time']
		return formatted


if __name__ == '__main__':
	OPSWATFileUpload().cli_file_upload()



