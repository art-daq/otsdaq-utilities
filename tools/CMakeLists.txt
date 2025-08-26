include(CetTest)
cet_enable_asserts()

cet_make_exec(NAME ots_table_download_csv LIBRARIES otsdaq::ConfigurationInterface) 
cet_make_exec(NAME ots_table_upload_csv LIBRARIES otsdaq::ConfigurationInterface) 

cet_script(ALWAYS_COPY
	# ProductsUpdate.py #Deprecated
	UpdateOTS.sh
	# AddNewInterface.py #Deprecated
	ots_check_whitespace.sh
	# ots_create_repo_from_demo.sh #Deprecated
	# ots_get_and_fix_repo.sh #Deprecated
	# ots_add_qualifiers_to_repo_product_deps.sh #Deprecated
	# displayVersionsAndQualifiers.sh #Deprecated
)

install_headers()
install_source()
