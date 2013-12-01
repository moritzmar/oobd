#!/bin/bash
FILE=$1
XSLT=$2
if [ ! -f "$FILE" ] || [ ! -f "$XSLT" ]
then
    echo "$0 translates xml files via XSLT transformation" ;
    echo "Usage: $0 xlst-file xml-file" ;
    exit ;
fi
xmlstarlet tr --omit-decl  $1 $2


