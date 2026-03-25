INFO:     127.0.0.1:58123 - "OPTIONS /api/v1/export/extract-text HTTP/1.1" 200 OK
INFO:app.features.user_profile.userprofile:[M365Service] Fetching profile for email: ranjith.gopi@pwc.com    
INFO:httpx:HTTP Request: GET https://login.microsoftonline.com/d4093791-9818-48dc-8880-35d134b8c79d/v2.0/.well-known/openid-configuration "HTTP/1.1 200 OK"
INFO:httpx:HTTP Request: GET https://login.microsoftonline.com/d4093791-9818-48dc-8880-35d134b8c79d/discovery/v2.0/keys "HTTP/1.1 200 OK"
Successfully fetched JWKS from Azure AD.
Public key retrieved for token validation.
INFO:app.features.export.router:[Export] Extracting text from file: Agentic_AI_Governance_in_Finance_Article_Varied_Bullets.docx
INFO:app.common.document_utils:Converting DOCX → PDF using docx2pdf
  0%|                                                                                 | 0/1 [00:00<?, ?it/s]ERROR:app.common.document_utils:Word to PDF conversion failed
Traceback (most recent call last):
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\common\document_utils.py", line 54, in convert_word_bytes_to_pdf
    convert(input_path, output_path)
    ~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\docx2pdf\__init__.py", line 106, in convert
    return windows(paths, keep_active)
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\docx2pdf\__init__.py", line 33, in windows
    doc.SaveAs(str(pdf_filepath), FileFormat=wdFormatPDF)
    ^^^^^^^^^^
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\venv\Lib\site-packages\win32com\client\dynamic.py", line 631, in __getattr__
    raise AttributeError(f"{self._username_}.{attr}")
AttributeError: Open.SaveAs

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "C:\Users\rgopi006\AppData\Local\Programs\Python\Python313\Lib\shutil.py", line 625, in _rmtree_unsafe
    os.unlink(fullname)
    ~~~~~~~~~^^^^^^^^^^
PermissionError: [WinError 32] The process cannot access the file because it is being used by another process: 'C:\\Users\\rgopi006\\AppData\\Local\\Temp\\tmpvutbjpgz\\input.docx'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "C:\Users\rgopi006\Music\Azure-MCX\BSC-MCX-backend\app\common\document_utils.py", line 45, in convert_word_bytes_to_pdf
    with tempfile.TemporaryDirectory() as tmp_dir:  # Auto-deleted on block exit
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~^^
  File "C:\Users\rgopi006\AppData\Local\Programs\Python\Python313\Lib\tempfile.py", line 950, in __exit__    
    self.cleanup()
    ~~~~~~~~~~~~^^
  File "C:\Users\rgopi006\AppData\Local\Programs\Python\Python313\Lib\tempfile.py", line 954, in cleanup     
    self._rmtree(self.name, ignore_errors=self._ignore_cleanup_errors)
    ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\AppData\Local\Programs\Python\Python313\Lib\tempfile.py", line 934, in _rmtree     
    _shutil.rmtree(name, onexc=onexc)
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\AppData\Local\Programs\Python\Python313\Lib\shutil.py", line 790, in rmtree        
    return _rmtree_unsafe(path, onexc)
  File "C:\Users\rgopi006\AppData\Local\Programs\Python\Python313\Lib\shutil.py", line 629, in _rmtree_unsafe
    onexc(os.unlink, fullname, err)
    ~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\rgopi006\AppData\Local\Programs\Python\Python313\Lib\tempfile.py", line 909, in onexc       
    _os.unlink(path)
    ~~~~~~~~~~^^^^^^
PermissionError: [WinError 32] The process cannot access the file because it is being used by another process: 'C:\\Users\\rgopi006\\AppData\\Local\\Temp\\tmpvutbjpgz\\input.docx'
ERROR:app.features.export.router:[Export] Extraction failed for Agentic_AI_Governance_in_Finance_Article_Varied_Bullets.docx: docx2pdf conversion failed: [WinError 32] The process cannot access the file because it is being used by another process: 'C:\\Users\\rgopi006\\AppData\\Local\\Temp\\tmpvutbjpgz\\input.docx'
INFO:     127.0.0.1:58123 - "POST /api/v1/export/extract-text HTTP/1.1" 500 Internal Server Error
