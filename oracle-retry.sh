#!/bin/bash
CID=ocid1.tenancy.oc1..aaaaaaaarvry5vkxzobdm63x4o2ktth6qlqrfwd23sstzikhkk72ddxocgkq
AD=NREd:AP-HYDERABAD-1-AD-1
IMG=ocid1.image.oc1.ap-hyderabad-1.aaaaaaaapcliizjtvzjc47ddc4p3te2sw6f4eelood7tblia54d77t6skbha
SUB=ocid1.subnet.oc1.ap-hyderabad-1.aaaaaaaactmgx5gf7s5yd7myrdlknospao6tecmdstkd6zjezsh7dawgrwva
KEY=~/.ssh/crm_key.pub
SC='{"ocpus":2,"memoryInGBs":12}'

while true; do
  echo "$(date) - Attempting to create instance..."
  oci compute instance launch --compartment-id $CID --availability-domain $AD --shape VM.Standard.A1.Flex --shape-config "$SC" --image-id $IMG --subnet-id $SUB --display-name crm-pro-vps --assign-public-ip true --ssh-authorized-keys-file $KEY && echo "SUCCESS!" && break
  echo "Out of capacity. Retrying in 60s..."
  sleep 60
done
