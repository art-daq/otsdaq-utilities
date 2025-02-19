include(CetTest)
cet_enable_asserts()

cet_script(ALWAYS_COPY
	ProductsUpdate.py
	UpdateOTS.sh
	AddNewInterface.py
	ots_create_repo_from_demo.sh
	ots_get_and_fix_repo.sh
	ots_add_qualifiers_to_repo_product_deps.sh
	displayVersionsAndQualifiers.sh
)

install_headers()
install_source()
